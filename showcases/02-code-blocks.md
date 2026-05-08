# 代码高亮测试

本文档测试 Shiki 代码高亮在多种编程语言下的渲染效果。
插件使用 `github-light` / `github-dark` 双主题，会自动跟随 VS Code 主题切换。

---

## TypeScript

```typescript
interface Config {
  host: string;
  port: number;
  debug?: boolean;
}

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function fetchData<T>(url: string, config: Config): Promise<Result<T>> {
  try {
    const response = await fetch(`${config.host}:${config.port}${url}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data: T = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

class EventEmitter<Events extends Record<string, unknown[]>> {
  private handlers = new Map<keyof Events, Set<Function>>();

  on<K extends keyof Events>(event: K, handler: (...args: Events[K]) => void) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]) {
    this.handlers.get(event)?.forEach(fn => fn(...args));
  }
}
```

## JavaScript

```javascript
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

class Observable {
  #subscribers = new Set();

  subscribe(fn) {
    this.#subscribers.add(fn);
    return () => this.#subscribers.delete(fn);
  }

  notify(data) {
    this.#subscribers.forEach(fn => fn(data));
  }
}

// Proxy-based reactive system
function reactive(target) {
  return new Proxy(target, {
    get(obj, prop) {
      track(obj, prop);
      return obj[prop];
    },
    set(obj, prop, value) {
      obj[prop] = value;
      trigger(obj, prop);
      return true;
    },
  });
}
```

## Python

```python
from dataclasses import dataclass, field
from typing import Generic, TypeVar, Optional
import asyncio

T = TypeVar('T')

@dataclass
class TreeNode(Generic[T]):
    value: T
    children: list['TreeNode[T]'] = field(default_factory=list)

    def add_child(self, value: T) -> 'TreeNode[T]':
        node = TreeNode(value)
        self.children.append(node)
        return node

    def dfs(self) -> list[T]:
        result = [self.value]
        for child in self.children:
            result.extend(child.dfs())
        return result

    def bfs(self) -> list[T]:
        from collections import deque
        result, queue = [], deque([self])
        while queue:
            node = queue.popleft()
            result.append(node.value)
            queue.extend(node.children)
        return result

async def fetch_all(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [session.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [await r.json() for r in responses]
```

## Rust

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone)]
struct Cache<K, V> {
    store: Arc<Mutex<HashMap<K, V>>>,
    capacity: usize,
}

impl<K: Eq + std::hash::Hash + Clone, V: Clone> Cache<K, V> {
    fn new(capacity: usize) -> Self {
        Cache {
            store: Arc::new(Mutex::new(HashMap::new())),
            capacity,
        }
    }

    fn get(&self, key: &K) -> Option<V> {
        self.store.lock().unwrap().get(key).cloned()
    }

    fn insert(&self, key: K, value: V) -> Result<(), &'static str> {
        let mut store = self.store.lock().unwrap();
        if store.len() >= self.capacity && !store.contains_key(&key) {
            return Err("Cache is full");
        }
        store.insert(key, value);
        Ok(())
    }
}

fn main() {
    let cache = Cache::new(100);
    cache.insert("key".to_string(), 42).unwrap();
    println!("{:?}", cache.get(&"key".to_string()));
}
```

## Go

```go
package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type WorkerPool struct {
	workers int
	tasks   chan func()
	wg      sync.WaitGroup
}

func NewWorkerPool(workers, queueSize int) *WorkerPool {
	return &WorkerPool{
		workers: workers,
		tasks:   make(chan func(), queueSize),
	}
}

func (p *WorkerPool) Start(ctx context.Context) {
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go func(id int) {
			defer p.wg.Done()
			for {
				select {
				case task, ok := <-p.tasks:
					if !ok {
						return
					}
					task()
				case <-ctx.Done():
					return
				}
			}
		}(i)
	}
}

func (p *WorkerPool) Submit(task func()) {
	p.tasks <- task
}

func (p *WorkerPool) Shutdown() {
	close(p.tasks)
	p.wg.Wait()
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool := NewWorkerPool(4, 100)
	pool.Start(ctx)

	for i := 0; i < 20; i++ {
		n := i
		pool.Submit(func() {
			fmt.Printf("Task %d completed\n", n)
		})
	}

	pool.Shutdown()
}
```

## HTML + CSS

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>示例页面</title>
  <style>
    :root {
      --primary: #3b82f6;
      --surface: #ffffff;
      --text: #1e293b;
    }

    .card {
      background: var(--surface);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease;
    }

    .card:hover {
      transform: translateY(-2px);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --surface: #1e293b;
        --text: #e2e8f0;
      }
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>卡片标题</h2>
    <p>卡片内容</p>
  </div>
</body>
</html>
```

## SQL

```sql
WITH monthly_revenue AS (
  SELECT
    DATE_TRUNC('month', order_date) AS month,
    product_category,
    SUM(amount) AS revenue,
    COUNT(DISTINCT customer_id) AS unique_customers,
    ROW_NUMBER() OVER (
      PARTITION BY DATE_TRUNC('month', order_date)
      ORDER BY SUM(amount) DESC
    ) AS rank
  FROM orders o
  JOIN products p ON o.product_id = p.id
  WHERE order_date >= '2024-01-01'
    AND status = 'completed'
  GROUP BY 1, 2
)
SELECT
  month,
  product_category,
  revenue,
  unique_customers,
  revenue / unique_customers AS avg_revenue_per_customer,
  LAG(revenue) OVER (PARTITION BY product_category ORDER BY month) AS prev_month_revenue
FROM monthly_revenue
WHERE rank <= 5
ORDER BY month DESC, rank;
```

## Shell / Bash

```bash
#!/bin/bash
set -euo pipefail

readonly LOG_FILE="/var/log/deploy.log"
readonly APP_DIR="/opt/app"

log() {
  local level="$1"; shift
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

deploy() {
  local version="${1:?Version is required}"
  local env="${2:-production}"

  log "INFO" "Deploying version $version to $env"

  cd "$APP_DIR" || exit 1
  git fetch origin
  git checkout "v${version}"

  if [[ "$env" == "production" ]]; then
    npm ci --production
    npm run build
    pm2 restart ecosystem.config.js --env production
  else
    npm install
    npm run build:dev
    pm2 restart ecosystem.config.js --env "$env"
  fi

  log "INFO" "Deployment complete: v${version} -> ${env}"
}

deploy "$@"
```

## JSON

```json
{
  "name": "vibe-documents",
  "version": "1.0.0",
  "contributes": {
    "commands": [
      {
        "command": "vibeDocuments.showPreview",
        "title": "Vibe: Open Preview",
        "icon": "$(open-preview)"
      }
    ],
    "keybindings": [
      {
        "command": "vibeDocuments.showPreview",
        "key": "ctrl+shift+v",
        "mac": "cmd+shift+v",
        "when": "editorLangId == markdown"
      }
    ]
  },
  "dependencies": {
    "react": "^19.0.0",
    "streamdown": "^2.5.0"
  }
}
```

## YAML

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - name: Upload coverage
        if: matrix.node-version == 20
        uses: codecov/codecov-action@v4
```

## C / C++

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct Node {
    int data;
    struct Node* next;
} Node;

Node* create_node(int data) {
    Node* node = (Node*)malloc(sizeof(Node));
    if (!node) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }
    node->data = data;
    node->next = NULL;
    return node;
}

void insert_sorted(Node** head, int data) {
    Node* new_node = create_node(data);
    if (!*head || (*head)->data >= data) {
        new_node->next = *head;
        *head = new_node;
        return;
    }
    Node* current = *head;
    while (current->next && current->next->data < data) {
        current = current->next;
    }
    new_node->next = current->next;
    current->next = new_node;
}

void print_list(Node* head) {
    for (Node* cur = head; cur; cur = cur->next)
        printf("%d -> ", cur->data);
    printf("NULL\n");
}
```

## Diff

```diff
--- a/src/config.ts
+++ b/src/config.ts
@@ -12,7 +12,9 @@ export const defaultConfig = {
   theme: 'auto',
   fontSize: 14,
-  lineNumbers: false,
+  lineNumbers: true,
+  wordWrap: 'on',
+  minimap: { enabled: false },
   tabSize: 2,
 };
```

## 行内代码

行内代码也应该正确渲染：`const x = 42;`、`npm install`、`git commit -m "fix"`。

一段包含多个行内代码的文本：使用 `useEffect` 钩子监听 `window` 的 `message` 事件，通过 `postMessage` 与 VS Code 扩展通信。
