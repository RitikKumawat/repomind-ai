import re
from typing import List, Dict, Any, Optional

HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "WS", "STOMP"}

def extract_routes_from_code(
    file_path: str,
    content: str,
    language: str = "ts",
) -> List[Dict[str, Any]]:
    """
    AST-like regex pattern extractor for API endpoints across multiple frameworks:
    - Spring Boot / Java / Kotlin (@RestController, @RequestMapping, @GetMapping, @PostMapping, etc.)
    - NestJS (@Controller, @Get, @Post, @Resolver, @Query, @Mutation, etc.)
    - Express / Fastify (app.get, router.post, etc.)
    - FastAPI / Flask (@app.get, @router.post, etc.)
    - Go Chi / Gin / Gorilla (r.GET, router.HandleFunc, etc.)
    - Spring WebSocket / STOMP (@EnableWebSocketMessageBroker, @MessageMapping, registry.addEndpoint)
    """
    endpoints: List[Dict[str, Any]] = []
    lines = content.splitlines()
    fpath_lower = file_path.lower()
    is_java_or_kt = fpath_lower.endswith((".java", ".kt")) or language in {"java", "kotlin"}

    # =========================================================================
    # 1. Spring Boot & Java/Kotlin Route Extraction
    # =========================================================================
    if is_java_or_kt or "@RestController" in content or "@Controller" in content or "@RequestMapping" in content or "@EnableWebSocketMessageBroker" in content:
        # 1a. Check for Spring WebSocket / STOMP configuration endpoints
        if "WebSocketMessageBrokerConfigurer" in content or "@EnableWebSocketMessageBroker" in content:
            ws_matches = re.finditer(
                r'registry\.addEndpoint\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
                content,
            )
            for wm in ws_matches:
                ws_path = wm.group(1)
                line_no = content[:wm.start()].count("\n") + 1
                endpoints.append({
                    "method": "WS",
                    "path": ws_path,
                    "summary": f"WebSocket STOMP Handshake ({ws_path})",
                    "description": "STOMP over WebSocket connection endpoint for real-time bidirectional messaging and subscriptions.",
                    "handler": "registerStompEndpoints",
                    "authRequired": False,
                    "authType": "Public",
                    "filePath": file_path,
                    "startLine": line_no,
                    "endLine": min(len(lines), line_no + 15),
                })

        # 1b. Locate class-level declaration line
        class_line_idx = -1
        for idx, l in enumerate(lines):
            if re.search(r"\b(?:class|interface|record)\s+[A-Za-z0-9_]+", l):
                class_line_idx = idx
                break

        # Extract class-level @RequestMapping prefix (e.g. @RequestMapping("/api/v1/vehicles"))
        spring_class_prefix = ""
        class_header = "\n".join(lines[:class_line_idx + 1]) if class_line_idx != -1 else content
        class_mapping_match = re.search(
            r"@RequestMapping\s*\(\s*(?:(?:value|path)\s*=\s*)?(?:\{?\s*[\'\"]([^\'\"]*)[\'\"]\s*\}?)",
            class_header,
        )
        if class_mapping_match:
            spring_class_prefix = "/" + class_mapping_match.group(1).strip("/")
            if spring_class_prefix == "/":
                spring_class_prefix = ""

        spring_pattern = re.compile(
            r"@\s*(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping|MessageMapping)"
            r"(?:\s*\(\s*(?:(?:value|path)\s*=\s*)?(?:\{?\s*[\'\"]([^\'\"]*)[\'\"]\s*\}?)?[^)]*\))?"
        )

        start_scan_idx = class_line_idx + 1 if class_line_idx != -1 else 0
        for i in range(start_scan_idx, len(lines)):
            line = lines[i]
            m = spring_pattern.search(line)
            if m:
                annot = m.group(1)
                sub_path = (m.group(2) or "").strip("/")

                method = "GET"
                if annot == "GetMapping":
                    method = "GET"
                elif annot == "PostMapping":
                    method = "POST"
                elif annot == "PutMapping":
                    method = "PUT"
                elif annot == "DeleteMapping":
                    method = "DELETE"
                elif annot == "PatchMapping":
                    method = "PATCH"
                elif annot == "MessageMapping":
                    method = "STOMP"
                elif annot == "RequestMapping":
                    req_m = re.search(r"RequestMethod\.([A-Z]+)", line)
                    method = req_m.group(1) if req_m else "GET"

                full_path = f"{spring_class_prefix}/{sub_path}".rstrip("/") if (spring_class_prefix or sub_path) else "/"
                full_path = re.sub(r"/+", "/", full_path)

                handler = "handler"
                for j in range(i + 1, min(i + 8, len(lines))):
                    fn_match = re.search(
                        r"(?:public|protected|private)?\s*(?:static\s+)?(?:<[^>]+>\s+)?[\w<>\[\]?]+\s+([A-Za-z0-9_]+)\s*\(",
                        lines[j],
                    )
                    if fn_match and fn_match.group(1) not in {
                        "GetMapping", "PostMapping", "PutMapping", "DeleteMapping",
                        "PatchMapping", "RequestMapping", "MessageMapping", "Override"
                    }:
                        handler = fn_match.group(1)
                        break

                param_text = ""
                for j in range(i, min(i + 12, len(lines))):
                    param_text += " " + lines[j]
                    if ")" in lines[j] and ("{" in lines[j] or ";" in lines[j]):
                        break

                extracted_params = []
                for pv in re.finditer(r'@PathVariable(?:\s*\(\s*(?:(?:value|name)\s*=\s*)?[\'"]([^\'"]+)[\'"]\s*\))?\s*[\w<>\[\]?]+\s+([A-Za-z0-9_]+)', param_text):
                    pname = pv.group(1) or pv.group(2)
                    extracted_params.append({
                        "name": pname,
                        "in": "path",
                        "type": "string",
                        "required": True,
                        "description": f"URL path parameter {pname}",
                    })

                for rp in re.finditer(r'@RequestParam(?:\s*\(\s*(?:(?:value|name)\s*=\s*)?[\'"]([^\'"]+)[\'"](?:[^)]*defaultValue\s*=\s*[\'"]([^\'"]*)[\'"])?[^)]*\))?\s*[\w<>\[\]?]+\s+([A-Za-z0-9_]+)', param_text):
                    pname = rp.group(1) or rp.group(3)
                    extracted_params.append({
                        "name": pname,
                        "in": "query",
                        "type": "string",
                        "required": "required = false" not in param_text,
                        "description": f"Query parameter {pname}",
                    })

                path_lower = full_path.lower()
                is_public = (
                    "login" in path_lower
                    or "register" in path_lower
                    or "signup" in path_lower
                    or "health" in path_lower
                    or "/check" in path_lower
                    or "public" in path_lower
                    or "@PermitAll" in content
                )
                auth_required = not is_public

                if not any(e["method"] == method and e["path"] == full_path for e in endpoints):
                    endpoints.append({
                        "method": method,
                        "path": full_path,
                        "summary": f"{method} {full_path} ({handler})",
                        "description": f"Spring Boot endpoint mapped to `{handler}` handler.",
                        "handler": handler,
                        "authRequired": auth_required,
                        "authType": "Bearer JWT" if auth_required else "Public",
                        "parameters": extracted_params,
                        "filePath": file_path,
                        "startLine": max(1, i + 1),
                        "endLine": min(len(lines), i + 20),
                    })

    # =========================================================================
    # 2. NestJS Controller Pattern (@Controller, @Get, @Post, etc.)
    # =========================================================================
    controller_prefix = ""
    controller_match = re.search(r"@Controller\s*\(\s*['\"]([^'\"]*)['\"]\s*\)", content)
    if controller_match:
        controller_prefix = controller_match.group(1).strip("/")
        if controller_prefix:
            controller_prefix = f"/{controller_prefix}"

    nestjs_pattern = re.compile(
        r"@(?:Public\(\)\s*)?(?:UseGuards\([^)]*\)\s*)?@(Get|Post|Put|Patch|Delete|Options|Head)\s*(?:\(\s*(?:['\"]([^'\"]*)['\"])?\s*\))?"
    )

    for i, line in enumerate(lines):
        # --- NestJS Detection ---
        nest_match = nestjs_pattern.search(line)
        if nest_match:
            method = nest_match.group(1).upper()
            sub_path = (nest_match.group(2) or "").strip("/")
            full_path = f"{controller_prefix}/{sub_path}".rstrip("/") if (controller_prefix or sub_path) else "/"
            full_path = re.sub(r"/+", "/", full_path)

            auth_required = True
            if "@Public" in content[:content.find(line)] or "@Public" in line:
                auth_required = False

            handler = "handler"
            for j in range(i + 1, min(i + 5, len(lines))):
                fn_match = re.search(r"(?:async\s+)?([A-Za-z0-9_]+)\s*\(", lines[j])
                if fn_match and fn_match.group(1) not in {"Get", "Post", "Put", "Delete", "Patch", "UseGuards", "Body", "Param", "Query"}:
                    handler = fn_match.group(1)
                    break

            if not any(e["method"] == method and e["path"] == full_path for e in endpoints):
                endpoints.append({
                    "method": method,
                    "path": full_path,
                    "summary": f"{method} {full_path} ({handler})",
                    "description": f"NestJS controller route handled by `{handler}`.",
                    "handler": handler,
                    "authRequired": auth_required,
                    "authType": "Bearer JWT" if auth_required else "Public",
                    "parameters": [],
                    "filePath": file_path,
                    "startLine": max(1, i + 1),
                    "endLine": min(len(lines), i + 20),
                })

        # --- NestJS GraphQL Detection: @Resolver, @Query, @Mutation, @Subscription ---
        graphql_match = re.search(
            r"@(Query|Mutation|Subscription)\s*\(\s*(?:(?:\(\)\s*=>\s*[^,\)]+)|['\"]([^'\"]*)['\"])?",
            line,
        )
        if graphql_match:
            gql_op = graphql_match.group(1).upper()
            gql_handler = "graphqlOperation"
            for j in range(i + 1, min(i + 25, len(lines))):
                l_strip = lines[j].strip()
                if "=>" in l_strip or l_strip.startswith(("filter:", "return ", "const ", "let ", "var ", "if ", "@Args", "@Context", "@CurrentUser")):
                    continue
                fn_match = re.search(r"^(?:async\s+)?([A-Za-z0-9_]+)\s*\(", l_strip)
                if fn_match and fn_match.group(1) not in {"Query", "Mutation", "Subscription", "Resolver", "Args", "Context", "CurrentUser", "Inject"}:
                    gql_handler = fn_match.group(1)
                    break

            gql_name = gql_handler
            auth_required = "CurrentUser" in content or "UseGuards" in content or "@Roles" in content
            gql_path = f"/graphql ({gql_op.lower()}: {gql_name})"

            if not any(e["path"] == gql_path for e in endpoints):
                endpoints.append({
                    "method": gql_op,
                    "path": gql_path,
                    "summary": f"GraphQL {gql_op.capitalize()}: {gql_name}",
                    "description": f"GraphQL {gql_op.lower()} resolver operation `{gql_name}`.",
                    "handler": gql_handler,
                    "authRequired": auth_required,
                    "authType": "Bearer JWT" if auth_required else "Public",
                    "parameters": [],
                    "filePath": file_path,
                    "startLine": max(1, i + 1),
                    "endLine": min(len(lines), i + 25),
                })

        # =====================================================================
        # 3. Express / Fastify Detection: router.get('/path', ...) or app.post(...)
        # =====================================================================
        express_match = re.search(
            r"(?:router|app)\.(get|post|put|patch|delete|options)\s*\(\s*['\"]([^'\"]+)['\"]",
            line,
            re.IGNORECASE,
        )
        if express_match:
            method = express_match.group(1).upper()
            path = express_match.group(2)
            if not any(e["path"] == path and e["method"] == method for e in endpoints):
                endpoints.append({
                    "method": method,
                    "path": path,
                    "summary": f"{method} {path}",
                    "description": f"Express/Fastify route handler for `{path}`.",
                    "handler": "expressHandler",
                    "authRequired": "auth" in line.lower() or "jwt" in line.lower(),
                    "authType": "Bearer JWT" if ("auth" in line.lower() or "jwt" in line.lower()) else "Public",
                    "parameters": [],
                    "filePath": file_path,
                    "startLine": i + 1,
                    "endLine": min(len(lines), i + 15),
                })

        # =====================================================================
        # 4. FastAPI / Flask Detection: @router.get("/path") or @app.post("/path")
        # =====================================================================
        fastapi_match = re.search(
            r"@(?:app|router|api_router|bp)\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]",
            line,
            re.IGNORECASE,
        )
        if fastapi_match:
            method = fastapi_match.group(1).upper()
            path = fastapi_match.group(2)
            handler = "api_handler"
            for j in range(i + 1, min(i + 4, len(lines))):
                fn_match = re.search(r"def\s+([A-Za-z0-9_]+)\s*\(", lines[j])
                if fn_match:
                    handler = fn_match.group(1)
                    break

            if not any(e["path"] == path and e["method"] == method for e in endpoints):
                endpoints.append({
                    "method": method,
                    "path": path,
                    "summary": f"{method} {path} ({handler})",
                    "description": f"FastAPI/Flask endpoint handled by function `{handler}`.",
                    "handler": handler,
                    "authRequired": "token" in content.lower() or "auth" in content.lower() or "depends(" in line.lower(),
                    "authType": "Bearer JWT" if ("token" in content.lower() or "auth" in content.lower()) else "Public",
                    "parameters": [],
                    "filePath": file_path,
                    "startLine": i + 1,
                    "endLine": min(len(lines), i + 20),
                })

        # =====================================================================
        # 5. Go Gin / Chi Detection: r.GET("/path", ...) or r.POST(...)
        # =====================================================================
        go_match = re.search(
            r"\.(GET|POST|PUT|PATCH|DELETE|HandleFunc)\s*\(\s*['\"]([^'\"]+)['\"]",
            line,
        )
        if go_match:
            method = go_match.group(1).upper()
            if method == "HANDLEFUNC":
                method = "GET"
            path = go_match.group(2)
            if not any(e["path"] == path and e["method"] == method for e in endpoints):
                endpoints.append({
                    "method": method,
                    "path": path,
                    "summary": f"{method} {path}",
                    "description": f"Go Gin/Chi route handler for `{path}`.",
                    "handler": "goHandler",
                    "authRequired": "auth" in line.lower() or "jwt" in line.lower(),
                    "authType": "Bearer JWT" if ("auth" in line.lower() or "jwt" in line.lower()) else "Public",
                    "parameters": [],
                    "filePath": file_path,
                    "startLine": i + 1,
                    "endLine": min(len(lines), i + 15),
                })

    return endpoints
