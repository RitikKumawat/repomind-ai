'use client';

import { useState } from 'react';
import {
  Container,
  Stack,
  Title,
  Text,
  Badge,
  Paper,
  Group,
  SimpleGrid,
  ThemeIcon,
} from '@mantine/core';
import {
  IconShieldLock,
  IconCode,
} from '@tabler/icons-react';

export function FrameworkExtractorSection() {
  const [selectedFramework, setSelectedFramework] = useState<string>('nestjs');

  const frameworks: Record<
    string,
    {
      name: string;
      tag: string;
      codeSnippet: string;
      astExtractedJson: string;
      parserStrategy: string;
    }
  > = {
    nestjs: {
      name: 'NestJS (TypeScript)',
      tag: 'TypeScript / Decorators',
      parserStrategy: 'Tree-sitter TS: Identifies class decorators (@Controller) and resolves method decorators (@Get, @Post, @Body, @UseGuards).',
      codeSnippet: `@Controller('users')
export class UsersController {
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUser(@Param('id') id: string): Promise<UserDto> {
    return this.usersService.findById(id);
  }
}`,
      astExtractedJson: `{
  "framework": "NestJS",
  "basePath": "/users",
  "method": "GET",
  "endpoint": "/users/:id",
  "guard": "JwtAuthGuard",
  "returnType": "UserDto",
  "source": "src/users/users.controller.ts:4-9"
}`,
    },
    fastapi: {
      name: 'FastAPI (Python)',
      tag: 'Python / Type Hints',
      parserStrategy: 'Tree-sitter Python: Inspects APIRouter decorator function calls and extracts Pydantic type annotations.',
      codeSnippet: `router = APIRouter(prefix="/v1/items")

@router.post("/", response_model=ItemResponse, status_code=201)
async def create_item(payload: ItemCreateDto, db: Session = Depends(get_db)):
    return item_service.create(db, payload)`,
      astExtractedJson: `{
  "framework": "FastAPI",
  "basePath": "/v1/items",
  "method": "POST",
  "endpoint": "/v1/items/",
  "statusCode": 201,
  "requestBody": "ItemCreateDto",
  "responseModel": "ItemResponse",
  "source": "routers/items.py:3-6"
}`,
    },
    express: {
      name: 'Express.js (Node.js)',
      tag: 'JavaScript / Middleware',
      parserStrategy: 'Tree-sitter JS: Walks call expressions matching app.[method]() and router.route() patterns.',
      codeSnippet: `const router = express.Router();

router.get('/health', authMiddleware, (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});`,
      astExtractedJson: `{
  "framework": "Express",
  "method": "GET",
  "endpoint": "/health",
  "middleware": ["authMiddleware"],
  "responseType": "application/json",
  "source": "routes/health.js:3-5"
}`,
    },
    springboot: {
      name: 'Spring Boot (Java)',
      tag: 'Java / Annotations',
      parserStrategy: 'Tree-sitter Java: Resolves @RestController, @RequestMapping, and method-level @GetMapping / @PostMapping annotations.',
      codeSnippet: `@RestController
@RequestMapping("/api/orders")
public class OrderController {
    @PostMapping
    public ResponseEntity<OrderDto> createOrder(@Valid @RequestBody CreateOrderRequest req) {
        return ResponseEntity.ok(orderService.placeOrder(req));
    }
}`,
      astExtractedJson: `{
  "framework": "Spring Boot",
  "basePath": "/api/orders",
  "method": "POST",
  "endpoint": "/api/orders",
  "requestBody": "CreateOrderRequest",
  "returnType": "ResponseEntity<OrderDto>",
  "source": "src/main/java/OrderController.java:4-9"
}`,
    },
    go: {
      name: 'Go (Gin & Fiber)',
      tag: 'Golang / HTTP Handlers',
      parserStrategy: 'Tree-sitter Go: Inspects router group declarations and method chaining on engine instances (*gin.Engine / *fiber.App).',
      codeSnippet: `func RegisterRoutes(r *gin.RouterGroup) {
    v1 := r.Group("/auth")
    {
        v1.POST("/token", handlers.HandleGenerateToken)
    }
}`,
      astExtractedJson: `{
  "framework": "Gin",
  "basePath": "/auth",
  "method": "POST",
  "endpoint": "/auth/token",
  "handler": "handlers.HandleGenerateToken",
  "source": "pkg/api/auth.go:3-7"
}`,
    },
  };

  const active = frameworks[selectedFramework] || frameworks.nestjs;

  return (
    <section
      id="api-explorer"
      style={{
        paddingTop: '80px',
        paddingBottom: '88px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
        scrollMarginTop: '84px',
      }}
    >
      <Container size="xl">
        <Stack align="center" gap="xs" ta="center" mb={48}>
          <Badge size="md" variant="light" color="blue" radius="sm">
            STATIC AST RECOGNITION
          </Badge>
          <Title
            order={2}
            fw={800}
            c="#0F172A"
            lts={-0.8}
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.4rem)' }}
          >
            Multi-Framework Static Route Extraction
          </Title>
          <Text fz={{ base: 'sm', sm: 'md' }} c="#64748B" maw={700}>
            Zero sandbox execution vulnerabilities. RepoMind extracts exact routes, parameter schemas, and guards statically from raw code syntax trees across multiple languages.
          </Text>
        </Stack>

        {/* Framework Selector Pills */}
        <Group justify="center" gap="xs" mb="xl" wrap="wrap">
          {Object.entries(frameworks).map(([key, f]) => (
            <Paper
              key={key}
              withBorder
              px="md"
              py="xs"
              radius="md"
              style={{
                cursor: 'pointer',
                backgroundColor: selectedFramework === key ? '#EFF6FF' : '#F8FAFC',
                borderColor: selectedFramework === key ? '#1C7ED6' : '#E2E8F0',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setSelectedFramework(key)}
            >
              <Group gap="xs">
                <IconCode
                  size={16}
                  color={selectedFramework === key ? '#1C7ED6' : '#64748B'}
                />
                <Text
                  size="sm"
                  fw={selectedFramework === key ? 700 : 500}
                  c={selectedFramework === key ? '#1C7ED6' : '#334155'}
                >
                  {f.name}
                </Text>
              </Group>
            </Paper>
          ))}
        </Group>

        {/* Strategy Bar */}
        <Paper
          p="sm"
          px="md"
          radius="md"
          mb="md"
          bg="#F8FAFC"
          withBorder
          style={{ borderColor: '#E2E8F0' }}
        >
          <Group gap="xs">
            <ThemeIcon color="blue" variant="light" size="sm" radius="xl">
              <IconShieldLock size={14} />
            </ThemeIcon>
            <Text size="xs" c="#334155">
              <strong>Extraction Strategy:</strong> {active.parserStrategy}
            </Text>
          </Group>
        </Paper>

        {/* Side-by-Side: Source Code vs Extracted AST JSON */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Source Code Panel */}
          <Paper
            withBorder
            radius="md"
            style={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: '#1E293B',
                borderBottom: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text size="xs" fw={700} c="#94A3B8" ff="monospace">
                INPUT: Raw Source Code File
              </Text>
              <Badge size="xs" color="gray" variant="outline">
                {active.tag}
              </Badge>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '16px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#E2E8F0',
                lineHeight: 1.5,
                overflowX: 'auto',
              }}
            >
              {active.codeSnippet}
            </pre>
          </Paper>

          {/* Extracted AST JSON Panel */}
          <Paper
            withBorder
            radius="md"
            style={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: '#1E293B',
                borderBottom: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text size="xs" fw={700} c="#38BDF8" ff="monospace">
                OUTPUT: Extracted Endpoint Schema
              </Text>
              <Badge size="xs" color="teal" variant="filled">
                AST Verified
              </Badge>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '16px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#34D399',
                lineHeight: 1.5,
                overflowX: 'auto',
              }}
            >
              {active.astExtractedJson}
            </pre>
          </Paper>
        </SimpleGrid>
      </Container>
    </section>
  );
}
