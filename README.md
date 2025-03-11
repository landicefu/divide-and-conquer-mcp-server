# Divide and Conquer MCP Server

A Model Context Protocol (MCP) server that enables AI agents to break down complex tasks into manageable pieces using a structured JSON format.

## Table of Contents

- [Purpose](#purpose)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Tools](#tools)
- [Usage Examples](#usage-examples)
- [Use Cases](#use-cases)
- [Configuration Storage](#configuration-storage)
- [Contributing](#contributing)
- [License](#license)

## Purpose

The Divide and Conquer MCP Server is an evolution of the Temp Notes MCP Server, designed specifically for complex tasks that need to be broken down into manageable pieces. Instead of using a simple text file, this server uses a structured JSON format to store task information, checklists, and context, making it easier to track progress and maintain context across multiple conversations.

## Key Features

- **Structured JSON Format**: Instead of plain text, uses a JSON structure to store task information
- **Task Tracking**: Includes checklist functionality with completion status tracking
- **Context Preservation**: Dedicated fields for task context and detailed descriptions
- **Progress Monitoring**: Easy visualization of completed vs. remaining tasks
- **Task Ordering**: Maintains the order of tasks for sequential execution
- **Task Insertion**: Ability to insert new tasks at specific positions in the checklist
- **Metadata**: Track additional information like tags, priority, and estimated completion time
- **Notes and Resources**: Store additional notes and resources related to the task

## Quick Start

1. Add the server to your MCP configuration:
   ```json
   {
     "mcpServers": {
       "divide-and-conquer": {
         "command": "node",
         "args": ["/path/to/divide-and-conquer-mcp-server/build/index.js"],
         "disabled": false
       }
     }
   }
   ```

2. Start using it in your conversations:
   ```javascript
   // Initialize a new task
   await use_mcp_tool({
     server_name: "divide-and-conquer",
     tool_name: "initialize_task",
     arguments: {
       task_description: "Refactor the authentication system",
       context_for_all_tasks: "The current system uses session-based authentication."
     }
   });
   
   // Add checklist items
   await use_mcp_tool({
     server_name: "divide-and-conquer",
     tool_name: "add_checklist_item",
     arguments: {
       task: "Analyze current authentication flow",
       detailed_description: "Review the existing authentication code.",
       context_and_plan: "Look at src/auth/* files. The current implementation uses express-session with MongoDB store."
     }
   });
   ```

## Installation

### Option 1: Install from source

1. Clone the repository:
   ```bash
   git clone https://github.com/landicefu/divide-and-conquer-mcp-server.git
   cd divide-and-conquer-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the server:
   ```bash
   npm run build
   ```

4. Add the server to your MCP configuration:
   ```json
   {
     "mcpServers": {
       "divide-and-conquer": {
         "command": "node",
         "args": ["/path/to/divide-and-conquer-mcp-server/build/index.js"],
         "disabled": false
       }
     }
   }
   ```

## Tools

The Divide and Conquer MCP Server provides the following tools:

### `initialize_task`

Creates a new task with the specified description and optional initial checklist items.

### `get_task`

Retrieves the current task information.

### `update_task_description`

Updates the main task description.

### `update_context`

Updates the context information for all tasks.

### `add_checklist_item`

Adds a new item to the checklist.

### `update_checklist_item`

Updates an existing checklist item.

### `mark_task_done`

Marks a checklist item as done.

### `mark_task_undone`

Marks a checklist item as not done.

### `remove_checklist_item`

Removes a checklist item.

### `reorder_checklist_item`

Moves a checklist item to a new position.

### `add_note`

Adds a note to the task.

### `add_resource`

Adds a resource to the task.

### `update_metadata`

Updates the task metadata.

### `clear_task`

Clears the current task data.

### `get_checklist_summary`

Returns a summary of the checklist with completion status. Context information is intentionally excluded from the summary to save context window space.

### `get_current_task_details`

Retrieves details of the current task (first uncompleted task) with full context, along with all other tasks with limited fields. For the current task, all fields including context_and_plan are included. For other tasks, only task, detailed_description, and done status are included (context_and_plan is excluded). This is the recommended tool to use when working with tasks.

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
        context_and_plan: "Look at src/auth/* files. The current implementation uses express-session with MongoDB store. Pay special attention to session expiration handling."
      },
      {
        task: "Design JWT implementation",
        detailed_description: "Create a design document outlining how JWT will be implemented.",
        context_and_plan: "Consider token structure, storage, and refresh mechanisms. Research best practices for JWT implementation in Node.js applications. Reference the security requirements document in docs/security.md."
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
// - tasks: Array of all tasks, where the current task (first uncompleted) has all fields including context_and_plan,
//   while other tasks have limited fields (task, detailed_description, done) without context_and_plan
// - current_task_index: Index of the current task (first uncompleted)
// - Additional task metadata, notes, resources, etc.
```

## Use Cases

### 1. Complex Software Development Tasks

When working on complex software development tasks, AI agents often face context window limitations that make it difficult to complete all steps in a single conversation. The Divide and Conquer MCP Server allows agents to:

- Break down large tasks into smaller, manageable pieces
- Track progress across multiple conversations
- Maintain important context that would otherwise be lost
- Organize tasks in a logical sequence
- Document decisions and resources

### 2. Project Planning and Management

For project planning and management tasks, the server enables:

- Creating structured project plans with tasks and subtasks
- Tracking progress and completion status
- Maintaining context and requirements
- Documenting decisions and resources
- Collaborating across multiple conversations

### 3. Research and Analysis

When conducting research and analysis, agents can:

- Break down research questions into specific areas to investigate
- Track progress and findings
- Maintain context and background information
- Document sources and resources
- Organize findings in a structured way

## JSON Structure

The server uses the following JSON structure to store task information:

```json
{
  "task_description": "A medium-level detailed description about the whole task. The final goal we want to achieve.",
  
  "checklist": [
    {
      "done": false,
      "task": "A short yet comprehensive name for the task",
      "detailed_description": "A longer description about what we want to achieve with this task",
      "context_and_plan": "Related information, files the agent should read, and more details from other tasks, as well as a detailed plan for this task. This is typically the longest string."
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

## Configuration Storage

By default, the Divide and Conquer MCP Server stores task data in the following location:

- On macOS/Linux: `~/.mcp_config/divide_and_conquer.json` (which expands to `/Users/username/.mcp_config/divide_and_conquer.json`)
- On Windows: `C:\Users\username\.mcp_config\divide_and_conquer.json`

This file is created automatically when you first initialize a task. If the file doesn't exist when you try to read task data, the server will return an empty task structure and create the file when you write to it next time.

The server handles the following scenarios:

- If the file doesn't exist when reading: Returns an empty task structure
- If the directory doesn't exist: Creates the directory structure automatically when writing
- If the file is corrupted or inaccessible: Returns appropriate error messages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.