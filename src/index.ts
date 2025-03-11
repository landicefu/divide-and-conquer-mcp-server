#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Configuration file path
const CONFIG_DIR = path.join(os.homedir(), '.mcp_config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'divide_and_conquer.json');

// Task structure interface
interface TaskNote {
  timestamp: string;
  content: string;
}

interface TaskResource {
  name: string;
  url: string;
  description?: string;
}

interface ChecklistItem {
  done: boolean;
  task: string;
  detailed_description: string;
  context_and_plan?: string;
}

interface TaskMetadata {
  created_at: string;
  updated_at: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  tags?: string[];
  priority?: 'high' | 'medium' | 'low';
  estimated_completion_time?: string;
}

interface TaskData {
  task_description: string;
  checklist: ChecklistItem[];
  context_for_all_tasks?: string;
  metadata: TaskMetadata;
  notes?: TaskNote[];
  resources?: TaskResource[];
}

// Default empty task structure
const DEFAULT_TASK_DATA: TaskData = {
  task_description: '',
  checklist: [],
  context_for_all_tasks: '',
  metadata: {
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    progress: {
      completed: 0,
      total: 0,
      percentage: 0
    }
  }
};

class DivideAndConquerServer {
  private server: Server;

  constructor() {
    // Initialize the MCP server
    this.server = new Server(
      {
        name: 'divide-and-conquer-server',
        version: '1.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Set up tool handlers
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'initialize_task',
          description: 'Creates a new task with the specified description and optional initial checklist items.',
          inputSchema: {
            type: 'object',
            properties: {
              task_description: {
                type: 'string',
                description: 'A medium-level detailed description about the whole task'
              },
              context_for_all_tasks: {
                type: 'string',
                description: 'Information that all tasks in the checklist should include'
              },
              initial_checklist: {
                type: 'array',
                description: 'Optional initial checklist items',
                items: {
                  type: 'object',
                  properties: {
                    task: {
                      type: 'string',
                      description: 'A short yet comprehensive name for the task'
                    },
                    detailed_description: {
                      type: 'string',
                      description: 'A longer description about what we want to achieve with this task'
                    },
                    context_and_plan: {
                      type: 'string',
                      description: 'Related information, files the agent should read, and more details from other tasks, as well as a detailed plan for this task'
                    },
                    done: {
                      type: 'boolean',
                      description: 'Whether the task is already completed',
                      default: false
                    }
                  },
                  required: ['task', 'detailed_description']
                }
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata for the task',
                properties: {
                  tags: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    description: 'Tags to categorize the task'
                  },
                  priority: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Priority level of the task'
                  },
                  estimated_completion_time: {
                    type: 'string',
                    description: 'Estimated completion time (ISO timestamp or duration)'
                  }
                }
              }
            },
            required: ['task_description']
          }
        },
        {
          name: 'update_task_description',
          description: 'Updates the main task description.',
          inputSchema: {
            type: 'object',
            properties: {
              task_description: {
                type: 'string',
                description: 'The new task description'
              }
            },
            required: ['task_description']
          }
        },
        {
          name: 'update_context',
          description: 'Updates the context information for all tasks.',
          inputSchema: {
            type: 'object',
            properties: {
              context_for_all_tasks: {
                type: 'string',
                description: 'The new context information for all tasks'
              }
            },
            required: ['context_for_all_tasks']
          }
        },
        {
          name: 'add_checklist_item',
          description: 'Adds a new item to the checklist.',
          inputSchema: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description: 'A short yet comprehensive name for the task'
              },
              detailed_description: {
                type: 'string',
                description: 'A longer description about what we want to achieve with this task'
              },
              context_and_plan: {
                type: 'string',
                description: 'Related information, files the agent should read, and more details from other tasks, as well as a detailed plan for this task'
              },
              done: {
                type: 'boolean',
                description: 'Whether the task is already completed',
                default: false
              },
              position: {
                type: 'number',
                description: 'Optional position to insert the task (0-based index). If not provided, the task will be added at the end.'
              }
            },
            required: ['task', 'detailed_description']
          }
        },
        {
          name: 'update_checklist_item',
          description: 'Updates an existing checklist item.',
          inputSchema: {
            type: 'object',
            properties: {
              index: {
                type: 'number',
                description: 'The index of the checklist item to update (0-based)'
              },
              task: {
                type: 'string',
                description: 'A short yet comprehensive name for the task'
              },
              detailed_description: {
                type: 'string',
                description: 'A longer description about what we want to achieve with this task'
              },
              context_and_plan: {
                type: 'string',
                description: 'Related information, files the agent should read, and more details from other tasks, as well as a detailed plan for this task'
              },
              done: {
                type: 'boolean',
                description: 'Whether the task is completed'
              }
            },
            required: ['index']
          }
        },
        {
          name: 'mark_task_done',
          description: 'Marks a checklist item as done.',
          inputSchema: {
            type: 'object',
            properties: {
              index: {
                type: 'number',
                description: 'The index of the checklist item to mark as done (0-based)'
              }
            },
            required: ['index']
          }
        },
        {
          name: 'mark_task_undone',
          description: 'Marks a checklist item as not done.',
          inputSchema: {
            type: 'object',
            properties: {
              index: {
                type: 'number',
                description: 'The index of the checklist item to mark as not done (0-based)'
              }
            },
            required: ['index']
          }
        },
        {
          name: 'remove_checklist_item',
          description: 'Removes a checklist item.',
          inputSchema: {
            type: 'object',
            properties: {
              index: {
                type: 'number',
                description: 'The index of the checklist item to remove (0-based)'
              }
            },
            required: ['index']
          }
        },
        {
          name: 'reorder_checklist_item',
          description: 'Moves a checklist item to a new position.',
          inputSchema: {
            type: 'object',
            properties: {
              from_index: {
                type: 'number',
                description: 'The current index of the checklist item (0-based)'
              },
              to_index: {
                type: 'number',
                description: 'The new index for the checklist item (0-based)'
              }
            },
            required: ['from_index', 'to_index']
          }
        },
        {
          name: 'add_note',
          description: 'Adds a note to the task.',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The content of the note'
              }
            },
            required: ['content']
          }
        },
        {
          name: 'add_resource',
          description: 'Adds a resource to the task.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the resource'
              },
              url: {
                type: 'string',
                description: 'URL or file path of the resource'
              },
              description: {
                type: 'string',
                description: 'Description of the resource'
              }
            },
            required: ['name', 'url']
          }
        },
        {
          name: 'update_metadata',
          description: 'Updates the task metadata.',
          inputSchema: {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Tags to categorize the task'
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'Priority level of the task'
              },
              estimated_completion_time: {
                type: 'string',
                description: 'Estimated completion time (ISO timestamp or duration)'
              }
            }
          }
        },
        {
          name: 'clear_task',
          description: 'Clears the current task data.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'get_checklist_summary',
          description: 'Returns a summary of the checklist with completion status.',
          inputSchema: {
            type: 'object',
            properties: {
              include_descriptions: {
                type: 'boolean',
                description: 'Whether to include detailed descriptions in the summary',
                default: false
              }
            }
          }
        },
        {
          name: 'get_current_task_details',
          description: 'Retrieves details of the current task (first uncompleted task) with full context. This is the recommended tool to use when working with tasks.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'initialize_task':
            return await this.initializeTask(request.params.arguments);
          case 'update_task_description':
            return await this.updateTaskDescription(request.params.arguments);
          case 'update_context':
            return await this.updateContext(request.params.arguments);
          case 'add_checklist_item':
            return await this.addChecklistItem(request.params.arguments);
          case 'update_checklist_item':
            return await this.updateChecklistItem(request.params.arguments);
          case 'mark_task_done':
            return await this.markTaskDone(request.params.arguments);
          case 'mark_task_undone':
            return await this.markTaskUndone(request.params.arguments);
          case 'remove_checklist_item':
            return await this.removeChecklistItem(request.params.arguments);
          case 'reorder_checklist_item':
            return await this.reorderChecklistItem(request.params.arguments);
          case 'add_note':
            return await this.addNote(request.params.arguments);
          case 'add_resource':
            return await this.addResource(request.params.arguments);
          case 'update_metadata':
            return await this.updateMetadata(request.params.arguments);
          case 'clear_task':
            return await this.clearTask();
          case 'get_checklist_summary':
            return await this.getChecklistSummary(request.params.arguments);
          case 'get_current_task_details':
            return await this.getCurrentTaskDetails();
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('Error handling tool call:', error);
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  // Ensure the config directory exists
  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.ensureDir(CONFIG_DIR);
    } catch (error) {
      console.error('Error creating config directory:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create config directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Read the task data from the config file
  private async readTaskData(): Promise<TaskData> {
    try {
      // Check if the file exists
      if (!await fs.pathExists(CONFIG_FILE)) {
        // If the file doesn't exist, return the default task data
        await this.ensureConfigDir();
        return { ...DEFAULT_TASK_DATA };
      }
      
      // Read the content from the file
      const content = await fs.readFile(CONFIG_FILE, 'utf8');
      
      try {
        // Parse the JSON content
        const taskData = JSON.parse(content) as TaskData;
        return taskData;
      } catch (parseError) {
        console.error('Error parsing task data:', parseError);
        // If the file is corrupted, return the default task data
        return { ...DEFAULT_TASK_DATA };
      }
    } catch (error) {
      console.error('Error reading task data:', error);
      // If there's an error reading the file, return the default task data
      return { ...DEFAULT_TASK_DATA };
    }
  }

  // Write the task data to the config file
  private async writeTaskData(taskData: TaskData): Promise<void> {
    try {
      await this.ensureConfigDir();
      
      // Update the metadata
      taskData.metadata.updated_at = new Date().toISOString();
      
      // Calculate progress
      const total = taskData.checklist.length;
      const completed = taskData.checklist.filter(item => item.done).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      taskData.metadata.progress = {
        completed,
        total,
        percentage
      };
      
      // Write the content to the file
      await fs.writeFile(CONFIG_FILE, JSON.stringify(taskData, null, 2), 'utf8');
    } catch (error) {
      console.error('Error writing task data:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to write task data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Initialize a new task
  private async initializeTask(args: any): Promise<any> {
    if (!args?.task_description) {
      throw new McpError(ErrorCode.InvalidParams, 'Task description is required');
    }

    try {
      // Create a new task data object
      const taskData: TaskData = {
        task_description: args.task_description,
        checklist: args.initial_checklist || [],
        context_for_all_tasks: args.context_for_all_tasks || '',
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress: {
            completed: 0,
            total: args.initial_checklist ? args.initial_checklist.length : 0,
            percentage: 0
          },
          ...(args.metadata || {})
        },
        notes: [],
        resources: []
      };
      
      // Ensure all checklist items have the done property
      taskData.checklist = taskData.checklist.map(item => ({
        ...item,
        done: item.done || false
      }));
      
      // Write the task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Task initialized successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error initializing task:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error initializing task: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Update the task description
  private async updateTaskDescription(args: any): Promise<any> {
    if (!args?.task_description) {
      throw new McpError(ErrorCode.InvalidParams, 'Task description is required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Update the task description
      taskData.task_description = args.task_description;
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Task description updated successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error updating task description:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error updating task description: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Update the context for all tasks
  private async updateContext(args: any): Promise<any> {
    if (!args?.context_for_all_tasks) {
      throw new McpError(ErrorCode.InvalidParams, 'Context for all tasks is required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Update the context for all tasks
      taskData.context_for_all_tasks = args.context_for_all_tasks;
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Context updated successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error updating context:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error updating context: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Add a new checklist item
  private async addChecklistItem(args: any): Promise<any> {
    if (!args?.task || !args?.detailed_description) {
      throw new McpError(ErrorCode.InvalidParams, 'Task and detailed description are required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Create the new checklist item
      const newItem: ChecklistItem = {
        task: args.task,
        detailed_description: args.detailed_description,
        context_and_plan: args.context_and_plan,
        done: args.done || false
      };
      
      // Add the item to the checklist at the specified position or at the end
      if (args.position !== undefined && args.position >= 0 && args.position <= taskData.checklist.length) {
        taskData.checklist.splice(args.position, 0, newItem);
      } else {
        taskData.checklist.push(newItem);
      }
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Checklist item added successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error adding checklist item:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error adding checklist item: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Update an existing checklist item
  private async updateChecklistItem(args: any): Promise<any> {
    if (args?.index === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'Index is required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Check if the index is valid
      if (args.index < 0 || args.index >= taskData.checklist.length) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid index: ${args.index}`);
      }
      
      // Update the checklist item
      if (args.task !== undefined) {
        taskData.checklist[args.index].task = args.task;
      }
      
      if (args.detailed_description !== undefined) {
        taskData.checklist[args.index].detailed_description = args.detailed_description;
      }
      
      if (args.context_and_plan !== undefined) {
        taskData.checklist[args.index].context_and_plan = args.context_and_plan;
      }
      
      if (args.done !== undefined) {
        taskData.checklist[args.index].done = args.done;
      }
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Checklist item updated successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error updating checklist item:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error updating checklist item: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Mark a checklist item as done
  private async markTaskDone(args: any): Promise<any> {
    if (args?.index === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'Index is required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Check if the index is valid
      if (args.index < 0 || args.index >= taskData.checklist.length) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid index: ${args.index}`);
      }
      
      // Mark the checklist item as done
      taskData.checklist[args.index].done = true;
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Task marked as done.',
          },
        ],
      };
    } catch (error) {
      console.error('Error marking task as done:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error marking task as done: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Mark a checklist item as not done
  private async markTaskUndone(args: any): Promise<any> {
    if (args?.index === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'Index is required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Check if the index is valid
      if (args.index < 0 || args.index >= taskData.checklist.length) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid index: ${args.index}`);
      }
      
      // Mark the checklist item as not done
      taskData.checklist[args.index].done = false;
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Task marked as not done.',
          },
        ],
      };
    } catch (error) {
      console.error('Error marking task as not done:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error marking task as not done: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Remove a checklist item
  private async removeChecklistItem(args: any): Promise<any> {
    if (args?.index === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'Index is required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Check if the index is valid
      if (args.index < 0 || args.index >= taskData.checklist.length) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid index: ${args.index}`);
      }
      
      // Remove the checklist item
      taskData.checklist.splice(args.index, 1);
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Checklist item removed successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error removing checklist item:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error removing checklist item: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Reorder a checklist item
  private async reorderChecklistItem(args: any): Promise<any> {
    if (args?.from_index === undefined || args?.to_index === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'From index and to index are required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Check if the indices are valid
      if (args.from_index < 0 || args.from_index >= taskData.checklist.length) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid from index: ${args.from_index}`);
      }
      
      if (args.to_index < 0 || args.to_index > taskData.checklist.length) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid to index: ${args.to_index}`);
      }
      
      // Move the checklist item
      const [item] = taskData.checklist.splice(args.from_index, 1);
      taskData.checklist.splice(args.to_index, 0, item);
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Checklist item reordered successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error reordering checklist item:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error reordering checklist item: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Add a note to the task
  private async addNote(args: any): Promise<any> {
    if (!args?.content) {
      throw new McpError(ErrorCode.InvalidParams, 'Note content is required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Initialize the notes array if it doesn't exist
      if (!taskData.notes) {
        taskData.notes = [];
      }
      
      // Add the note
      taskData.notes.push({
        timestamp: new Date().toISOString(),
        content: args.content
      });
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Note added successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error adding note:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error adding note: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Add a resource to the task
  private async addResource(args: any): Promise<any> {
    if (!args?.name || !args?.url) {
      throw new McpError(ErrorCode.InvalidParams, 'Resource name and URL are required');
    }

    try {
      const taskData = await this.readTaskData();
      
      // Initialize the resources array if it doesn't exist
      if (!taskData.resources) {
        taskData.resources = [];
      }
      
      // Add the resource
      taskData.resources.push({
        name: args.name,
        url: args.url,
        description: args.description || ''
      });
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Resource added successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error adding resource:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error adding resource: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Update the task metadata
  private async updateMetadata(args: any): Promise<any> {
    try {
      const taskData = await this.readTaskData();
      
      // Update the metadata
      if (args.tags !== undefined) {
        taskData.metadata.tags = args.tags;
      }
      
      if (args.priority !== undefined) {
        taskData.metadata.priority = args.priority;
      }
      
      if (args.estimated_completion_time !== undefined) {
        taskData.metadata.estimated_completion_time = args.estimated_completion_time;
      }
      
      // Write the updated task data to the file
      await this.writeTaskData(taskData);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Metadata updated successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error updating metadata:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error updating metadata: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Clear the task data
  private async clearTask(): Promise<any> {
    try {
      // Write the default task data to the file
      await this.writeTaskData({ ...DEFAULT_TASK_DATA });
      
      return {
        content: [
          {
            type: 'text',
            text: 'Task cleared successfully.',
          },
        ],
      };
    } catch (error) {
      console.error('Error clearing task:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error clearing task: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Get details of the current task (first uncompleted task) and all other tasks with limited fields
  private async getCurrentTaskDetails(): Promise<any> {
    try {
      const taskData = await this.readTaskData();
      
      // Find the first uncompleted task
      const currentTaskIndex = taskData.checklist.findIndex(item => !item.done);
      
      // Process all tasks with different detail levels
      const tasks = taskData.checklist.map((item, index) => {
        if (index === currentTaskIndex) {
          // For the current task (first uncompleted), include all fields
          return {
            index,
            ...item,
            is_current: true
          };
        } else {
          // For other tasks, exclude context_and_plan to save context window space
          const { context_and_plan, ...taskWithoutContext } = item;
          return {
            index,
            ...taskWithoutContext,
            is_current: false
          };
        }
      });
      
      // Format the response
      let response = {
        ultimate_goal: {
          description: taskData.task_description,
          note: "This is the final goal of the entire task, not just the current step."
        },
        current_task_index: currentTaskIndex,
        tasks: tasks,
        context_for_all_tasks: taskData.context_for_all_tasks || "",
        progress: taskData.metadata.progress,
        metadata: taskData.metadata,
        notes: taskData.notes || [],
        resources: taskData.resources || []
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error getting current task details:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting current task details: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Get a summary of the checklist
  private async getChecklistSummary(args: any): Promise<any> {
    try {
      const taskData = await this.readTaskData();
      
      // Generate the summary
      const includeDescriptions = args?.include_descriptions || false;
      
      let summary = `# Task: ${taskData.task_description}\n\n`;
      
      if (taskData.context_for_all_tasks) {
        summary += `## Context\n\n${taskData.context_for_all_tasks}\n\n`;
      }
      
      summary += `## Progress: ${taskData.metadata.progress.completed}/${taskData.metadata.progress.total} (${taskData.metadata.progress.percentage}%)\n\n`;
      
      summary += '## Checklist\n\n';
      
      taskData.checklist.forEach((item, index) => {
        const checkbox = item.done ? '[x]' : '[ ]';
        summary += `${index}. ${checkbox} ${item.task}\n`;
        
        if (includeDescriptions) {
          if (item.detailed_description) {
            summary += `   - Description: ${item.detailed_description.replace(/\n/g, '\n     ')}\n`;
          }
          
          // Context is intentionally excluded from summary to save context window space
        }
      });
      
      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting checklist summary:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting checklist summary: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Start the server
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Divide and Conquer MCP server running on stdio');
  }
}

// Create and run the server
const server = new DivideAndConquerServer();
server.run().catch(console.error);