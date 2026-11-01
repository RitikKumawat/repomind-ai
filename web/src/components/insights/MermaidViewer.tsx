'use client';

import { useEffect, useRef, useState, useId } from 'react';
import {
  Paper,
  Group,
  ActionIcon,
  Text,
  Badge,
  Loader,
  Center,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  IconZoomIn,
  IconZoomOut,
  IconRefresh,
  IconCopy,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';
import mermaid from 'mermaid';

interface MermaidViewerProps {
  chart: string;
}

const ARROW_REGEX = /-->|-\.->|==>|--o/;
let renderCounter = 0;

function sanitizeMermaidChart(chart: string): string {
  if (!chart) return 'graph TD\n    A[Codebase] --> B[Ready]';

  const lines = chart
    .trim()
    .split('\n')
    .map((rawLine) => {
      let line = rawLine.trim();
      if (line.startsWith('```')) return '';

      // Convert trailing sequence-style colon to flowchart pipe: A --> B : label -> A -->|label| B
      if (line.includes(':') && !line.includes('|')) {
        const colonIdx = line.lastIndexOf(':');
        const leftPart = line.slice(0, colonIdx).trim();
        const label = line.slice(colonIdx + 1).trim();
        const arrowMatch = ARROW_REGEX.exec(leftPart);
        if (arrowMatch?.index !== undefined) {
          const arrow = arrowMatch[0];
          const source = leftPart.slice(0, arrowMatch.index).trim();
          const target = leftPart.slice(arrowMatch.index + arrow.length).trim();
          if (source && target && label) {
            line = `${source} ${arrow}|${label}| ${target}`;
          }
        }
      }

      // Convert "-- label -->" to "-->|label|" without super-linear backtracking
      line = line.replace(/\s+--\s+([^-\n]+?)\s*-->\s*/g, ' -->|$1| ');

      // Normalize connector --o to --> for standard flowchart compatibility
      line = line.replace(/\s+--o\|/g, ' -->|');
      line = line.replace(/\s+--o\s+/g, ' --> ');

      // Quote unquoted pipe edge labels: |WebSocket (STOMP)| -> |"WebSocket (STOMP)"|
      line = line.replace(/\|([^|\n]+)\|/g, (_, labelContent: string) => {
        const trimmed = labelContent.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          return `|${trimmed}|`;
        }
        const clean = trimmed.replace(/"/g, "'");
        return `|"${clean}"|`;
      });

      // Auto-quote unquoted labels containing parentheses, slashes, or colons without super-linear backtracking
      line = line.replace(/(?<![([])\[([^[\]"\n]+)\](?![)\]])/g, (match, inner: string) => {
        if (/[\(\)\/:\,\.]/.test(inner)) {
          return `["${inner}"]`;
        }
        return match;
      });

      // Fix unquoted subgraph spaces: subgraph Backend Services -> subgraph Backend_Services["Backend Services"]
      if (line.startsWith('subgraph ') && !line.includes('[') && !line.includes('"')) {
        const title = line.slice(9).trim();
        if (title.includes(' ')) {
          const safeId = title.replace(/[^A-Za-z0-9_]/g, '_');
          line = `subgraph ${safeId}["${title}"]`;
        }
      }

      return line;
    })
    .filter(Boolean);

  let result = lines.join('\n').trim();
  if (!result.startsWith('graph') && !result.startsWith('flowchart')) {
    result = `graph TD\n${result}`;
  }
  return result;
}

export function MermaidViewer({ chart }: Readonly<MermaidViewerProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedChartRef = useRef<string>('');
  const [renderState, setRenderState] = useState<{
    renderedChart: string;
    svg: string;
    error: string | null;
  }>({
    renderedChart: '',
    svg: '',
    error: null,
  });
  const [zoom, setZoom] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const uniqueId = useId().replace(/:/g, '_');

  const cleanChart = sanitizeMermaidChart(chart);
  const isLoading = renderState.renderedChart !== cleanChart && !renderState.error;
  const svgContent = renderState.svg;
  const error = renderState.error;

  useEffect(() => {
    let isMounted = true;

    // If this chart has already been rendered and we have the SVG, restore container if needed and skip re-rendering
    if (renderedChartRef.current === cleanChart && renderState.svg) {
      if (containerRef.current && containerRef.current.innerHTML !== renderState.svg) {
        containerRef.current.innerHTML = renderState.svg;
      }
      return;
    }

    async function renderDiagram() {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });

        // Use a deterministic monotonic counter to avoid pseudo-random number generators (S2245)
        const renderId = `mermaid_${uniqueId}_${++renderCounter}`;
        let renderedSvg = '';
        try {
          const { svg } = await mermaid.render(renderId, cleanChart);
          renderedSvg = svg;
        } catch (initialErr: unknown) {
          console.warn('Initial Mermaid render failed, attempting syntax repair pass...', initialErr);
          // Aggressive repair: strip complex edge labels that might cause grammar conflicts
          const repairedChart = cleanChart
            .split('\n')
            .map((l) => l.replace(/(-->|-\.->|==>)\|[^|]+\|/g, '$1'))
            .join('\n');
          const retryId = `${renderId}_retry`;
          const { svg } = await mermaid.render(retryId, repairedChart);
          renderedSvg = svg;
        }

        if (isMounted) {
          renderedChartRef.current = cleanChart;
          setRenderState({
            renderedChart: cleanChart,
            svg: renderedSvg,
            error: null,
          });
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error('Mermaid render error:', err);
          renderedChartRef.current = '';
          setRenderState({
            renderedChart: cleanChart,
            svg: '',
            error:
              err instanceof Error
                ? err.message
                : 'Could not render Mermaid diagram. Diagram syntax may be invalid.',
          });
        }
      }
    }

    void renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [cleanChart, uniqueId, renderState.svg]);

  useEffect(() => {
    if (containerRef.current && svgContent && containerRef.current.innerHTML !== svgContent) {
      containerRef.current.innerHTML = svgContent;
    }
  }, [svgContent]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract nested ternary into an independent statement (S3358)
  let renderContent: React.ReactNode;
  if (isLoading) {
    renderContent = (
      <Center py="xl" style={{ minHeight: 300 }}>
        <Loader size="md" color="indigo" />
      </Center>
    );
  } else if (error) {
    renderContent = (
      <Alert
        icon={<IconAlertTriangle size={18} />}
        color="red"
        title="Rendering Error"
        variant="light"
        radius="md"
      >
        {error}
        <pre
          style={{
            fontSize: '11px',
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
            overflowX: 'auto',
          }}
        >
          {chart}
        </pre>
      </Alert>
    );
  } else {
    renderContent = (
      <div
        ref={containerRef}
        key={renderState.renderedChart || 'mermaid-diagram'}
        style={{
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 320,
          padding: '16px',
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease',
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-body)',
        minHeight: 380,
      }}
    >
      {/* Top action toolbar */}
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Badge variant="light" color="indigo" size="sm">
            Architecture Flowchart
          </Badge>
          <Text size="xs" c="dimmed">
            Zoom: {Math.round(zoom * 100)}%
          </Text>
        </Group>

        <Group gap="xs">
          <Tooltip label="Zoom In">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setZoom((z) => Math.min(z + 0.2, 2.4))}
            >
              <IconZoomIn size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Zoom Out">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
            >
              <IconZoomOut size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reset Zoom">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setZoom(1)}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={copied ? 'Copied!' : 'Copy Mermaid Source'}>
            <ActionIcon
              variant="subtle"
              color={copied ? 'teal' : 'gray'}
              size="sm"
              onClick={handleCopy}
            >
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Render Area */}
      {renderContent}
    </Paper>
  );
}
