# Divide and Conquer MCP Server - Implementation Plan

## Overview

The Divide and Conquer MCP Server is an evolution of the Temp Notes MCP Server, designed specifically for complex tasks that need to be broken down into manageable pieces. Instead of using a simple text file, this server uses a structured JSON format to store task information, checklists, and context, making it easier to track progress and maintain context across multiple conversations.

## Key Improvements Over Temp Notes Server

1. **Structured JSON Format**: Instead of plain text, uses a JSON structure to store task information
2. **Task Tracking**: Includes checklist functionality with completion status tracking
3. **Context Preservation**: Dedicated fields for task context and detailed descriptions
4. **Progress Monitoring**: Easy visualization of completed vs. remaining tasks
5. **Task Ordering**: Maintains the order of tasks for sequential execution
6. **Task Insertion**: Ability to insert new tasks at specific positions in the checklist

## JSON Structure

The server will use the following JSON structure to store task information:

```json
{
  "task_description": "A medium-level detailed description about the whole task. The final goal we want to achieve.",
  
  "checklist": [
    {
      "done": false,
      "task": "A short yet comprehensive name for the task",
      "detailed_description": "A longer description about what we want to achieve with this task",
      "context": "Related information, files the agent should read, and more details from other tasks. This is typically the longest string."
    }
  ],
  
  "context_for_all_tasks": "Information that all tasks in the checklist should include.",
  
  "metadata": {
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp",
    "progress": {
      "completed": 0,
      "total": 1,
      "percentage": 0
    },
    "tags": ["tag1", "tag2"],
    "priority": "high|medium|low",
    "estimated_completion_time": "ISO timestamp or duration"
  },
  
  "notes": [
    {
      "timestamp": "ISO timestamp",
      "content": "Additional notes or observations about the overall task"
    }
  ],
  
  "resources": [
    {
      "name": "Resource name",
      "url": "URL or file path",
      "description": "Description of the resource"
    }
  ]
}
```

## Storage Location

The server will store the JSON data in the following locations:

- On macOS/Linux: `~/.mcp_config/divide_and_conquer.json`
- On Windows: `C:\Users\username\.mcp_config\divide_and_conquer.json`

The server will handle the following scenarios:

- If the file doesn't exist when reading: Returns an empty JSON structure
- If the directory doesn't exist: Creates the directory structure automatically when writing
- If the file is corrupted or inaccessible: Returns appropriate error messages

## Tools

The Divide and Conquer MCP Server will provide the following tools:

### `initialize_task`

Creates a new task with the specified description and optional initial checklist items.

```json
{
  "type": "object",
  "properties": {
    "task_description": {
      "type": "string",
      "description": "A medium-level detailed description about the whole task"
    },
    "context_for_all_tasks": {
      "type": "string",
      "description": "Information that all tasks in the checklist should include"
    },
    "initial_checklist": {
      "type": "array",
      "description": "Optional initial checklist items",
      "items": {
        "type": "object",
        "properties": {
          "task": {
            "type": "string",
            "description": "A short yet comprehensive name for the task"
          },
          "detailed_description": {
            "type": "string",
            "description": "A longer description about what we want to achieve with this task"
          },
          "context": {
            "type": "string",
            "description": "Related information, files the agent should read, and more details from other tasks"
          },
          "done": {
            "type": "boolean",
            "description": "Whether the task is already completed",
            "default": false
          }
        },
        "required": ["task", "detailed_description"]
      }
    },
    "metadata": {
      "type": "object",
      "description": "Optional metadata for the task",
      "properties": {
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Tags to categorize the task"
        },
        "priority": {
          "type": "string",
          "enum": ["high", "medium", "low"],
          "description": "Priority level of the task"
        },
        "estimated_completion_time": {
          "type": "string",
          "description": "Estimated completion time (ISO timestamp or duration)"
        }
      }
    }
  },
  "required": ["task_description"]
}
```

### `get_task`

Retrieves the current task information.

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### `update_task_description`

Updates the main task description.

```json
{
  "type": "object",
  "properties": {
    "task_description": {
      "type": "string",
      "description": "The new task description"
    }
  },
  "required": ["task_description"]
}
```

### `update_context`

Updates the context information for all tasks.

```json
{
  "type": "object",
  "properties": {
    "context_for_all_tasks": {
      "type": "string",
      "description": "The new context information for all tasks"
    }
  },
  "required": ["context_for_all_tasks"]
}
```

### `add_checklist_item`

Adds a new item to the checklist.

```json
{
  "type": "object",
  "properties": {
    "task": {
      "type": "string",
      "description": "A short yet comprehensive name for the task"
    },
    "detailed_description": {
      "type": "string",
      "description": "A longer description about what we want to achieve with this task"
    },
    "context": {
      "type": "string",
      "description": "Related information, files the agent should read, and more details from other tasks"
    },
    "done": {
      "type": "boolean",
      "description": "Whether the task is already completed",
      "default": false
    },
    "position": {
      "type": "number",
      "description": "Optional position to insert the task (0-based index). If not provided, the task will be added at the end."
    }
  },
  "required": ["task", "detailed_description"]
}
```

### `update_checklist_item`

Updates an existing checklist item.

```json
{
  "type": "object",
  "properties": {
    "index": {
      "type": "number",
      "description": "The index of the checklist item to update (0-based)"
    },
    "task": {
      "type": "string",
      "description": "A short yet comprehensive name for the task"
    },
    "detailed_description": {
      "type": "string",
      "description": "A longer description about what we want to achieve with this task"
    },
    "context": {
      "type": "string",
      "description": "Related information, files the agent should read, and more details from other tasks"
    },
    "done": {
      "type": "boolean",
      "description": "Whether the task is completed"
    }
  },
  "required": ["index"]
}
```

### `mark_task_done`

Marks a checklist item as done.

```json
{
  "type": "object",
  "properties": {
    "index": {
      "type": "number",
      "description": "The index of the checklist item to mark as done (0-based)"
    }
  },
  "required": ["index"]
}
```

### `mark_task_undone`

Marks a checklist item as not done.

```json
{
  "type": "object",
  "properties": {
    "index": {
      "type": "number",
      "description": "The index of the checklist item to mark as not done (0-based)"
    }
  },
  "required": ["index"]
}
```

### `remove_checklist_item`

Removes a checklist item.

```json
{
  "type": "object",
  "properties": {
    "index": {
      "type": "number",
      "description": "The index of the checklist item to remove (0-based)"
    }
  },
  "required": ["index"]
}
```

### `reorder_checklist_item`

Moves a checklist item to a new position.

```json
{
  "type": "object",
  "properties": {
    "from_index": {
      "type": "number",
      "description": "The current index of the checklist item (0-based)"
    },
    "to_index": {
      "type": "number",
      "description": "The new index for the checklist item (0-based)"
    }
  },
  "required": ["from_index", "to_index"]
}
```

### `add_note`

Adds a note to the task.

```json
{
  "type": "object",
  "properties": {
    "content": {
      "type": "string",
      "description": "The content of the note"
    }
  },
  "required": ["content"]
}
```

### `add_resource`

Adds a resource to the task.

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the resource"
    },
    "url": {
      "type": "string",
      "description": "URL or file path of the resource"
    },
    "description": {
      "type": "string",
      "description": "Description of the resource"
    }
  },
  "required": ["name", "url"]
}
```

### `update_metadata`

Updates the task metadata.

```json
{
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Tags to categorize the task"
    },
    "priority": {
      "type": "string",
      "enum": ["high", "medium", "low"],
      "description": "Priority level of the task"
    },
    "estimated_completion_time": {
      "type": "string",
      "description": "Estimated completion time (ISO timestamp or duration)"
    }
  }
}
```

### `clear_task`

Clears the current task data.

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### `get_checklist_summary`

Returns a summary of the checklist with completion status. Context information is intentionally excluded from the summary to save context window space.

```json
{
  "type": "object",
  "properties": {
    "include_descriptions": {
      "type": "boolean",
      "description": "Whether to include detailed descriptions in the summary",
      "default": false
    }
  }
}
```

### `get_current_task_details`

Retrieves details of the current task (first uncompleted task) with full context, along with all other tasks with limited fields. For the current task, all fields including context are included. For other tasks, only task, detailed_description, and done status are included (context is excluded). This is the recommended tool to use when working with tasks.

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

## Implementation Details

The server will be implemented using TypeScript and the MCP SDK. It will:

1. Initialize with a JSON structure
2. Handle file operations with proper error handling
3. Provide tools for manipulating the task structure
4. Automatically update metadata like timestamps and progress
5. Handle edge cases like missing files or directories

## Configuration File Handling

The server will handle configuration files as follows:

- On first run, it will check for the existence of the `.mcp_config` directory and create it if needed
- If no configuration file exists, it will create an empty JSON structure
- The server will handle file read/write errors gracefully
- For Mac: `~/.mcp_config/divide_and_conquer.json`
- For Windows: `C:\Users\username\.mcp_config\divide_and_conquer.json`

If the `.mcp_config` folder doesn't exist, the server will create it. If the configuration file doesn't exist, the server will create it with an empty task structure when needed. The server will not throw errors in these cases, ensuring a smooth user experience.

## Usage Examples

### Initializing a Complex Task

```javascript
await use_mcp_tool({
  server_name: "divide-and-conquer",
  tool_name: "initialize_task",
  arguments: {
    task_description: "Refactor the authentication system to use JWT tokens and improve security",
    context_for_all_tasks: "The current system uses session-based authentication with cookies. We need to migrate to JWT for better scalability and security.",
    initial_checklist: [
      {
        task: "Analyze current authentication flow",
        detailed_description: "Review the existing authentication code to understand the current flow.",
        context: "Look at src/auth/* files. The current implementation uses express-session with MongoDB store. Pay special attention to session expiration handling."
      },
      {
        task: "Design JWT implementation",
        detailed_description: "Create a design document outlining how JWT will be implemented.",
        context: "Consider token structure, storage, and refresh mechanisms. Research best practices for JWT implementation in Node.js applications. Reference the security requirements document in docs/security.md."
      },
      {
        task: "Implement JWT authentication backend",
        detailed_description: "Modify the backend to generate and validate JWT tokens.",
        context: "Use the jsonwebtoken library. Implement in src/auth/jwt.js. Make sure to handle token refresh and revocation. Update the login and authentication middleware."
      }
    ],
    metadata: {
      tags: ["security", "refactoring", "authentication"],
      priority: "high",
      estimated_completion_time: "2 weeks"
    }
  }
});
```

### Retrieving Task Information

```javascript
const result = await use_mcp_tool({
  server_name: "divide-and-conquer",
  tool_name: "get_task",
  arguments: {}
});

// Result contains the complete task structure
```

### Adding a New Checklist Item

```javascript
await use_mcp_tool({
  server_name: "divide-and-conquer",
  tool_name: "add_checklist_item",
  arguments: {
    task: "Update frontend to use JWT",
    detailed_description: "Modify the frontend authentication service to store and use JWT tokens instead of relying on cookies.",
    position: 3 // Insert after the backend implementation
  }
});
```

### Marking a Task as Complete

```javascript
await use_mcp_tool({
  server_name: "divide-and-conquer",
  tool_name: "mark_task_done",
  arguments: {
    index: 0 // Mark the first task as done
  }
});
```

### Getting a Checklist Summary

```javascript
const summary = await use_mcp_tool({
  server_name: "divide-and-conquer",
  tool_name: "get_checklist_summary",
  arguments: {
    include_descriptions: true
  }
});

// Result contains a formatted summary of the checklist with completion status (context is excluded to save space)
```

### Getting Current Task Details

```javascript
const taskDetails = await use_mcp_tool({
  server_name: "divide-and-conquer",
  tool_name: "get_current_task_details",
  arguments: {}
});

// Result contains:
// - ultimate_goal: The final goal of the entire task (task_description)
// - tasks: Array of all tasks, where the current task (first uncompleted) has all fields including context,
//   while other tasks have limited fields (task, detailed_description, done) without context
// - current_task_index: Index of the current task (first uncompleted)
// - Additional task metadata, notes, resources, etc.
```

## Benefits for Complex Tasks

The Divide and Conquer MCP Server is particularly useful for:

1. **Breaking down complex tasks**: Helps agents divide large tasks into manageable pieces
2. **Maintaining context**: Preserves important context across multiple conversations
3. **Tracking progress**: Provides clear visibility into what's been done and what remains
4. **Organizing work**: Structures tasks in a logical sequence
5. **Documenting decisions**: Captures notes and resources related to the task
6. **Collaborative work**: Enables multiple agents or users to work on different parts of a task

This structured approach makes it easier to handle complex, multi-step tasks that would otherwise be difficult to manage within a single conversation or context window.