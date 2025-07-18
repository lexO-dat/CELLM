import { ApiResponse } from '../types';

//production:
const API_BASE_URL = 'https://134.199.140.227/llm'; // LLM Gateway with reverse proxy
const CELLO_API_URL = 'https://134.199.140.227/cello'; // Cello API with reverse proxy

//development:
// const API_BASE_URL = 'http://localhost:8088'; // LLM Gateway
// const CELLO_API_URL = 'http://localhost:8000'; // Cello API

class ApiService {
  // UCF Selection
  async selectUcf(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/models/ucf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: prompt }),
      });

      if (!response.ok) {
        throw new Error(`UCF API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.answer || 'Eco1C1G1T1'; // Default fallback
    } catch (error) {
      console.error('Error selecting UCF:', error);
      return 'Eco1C1G1T1'; // Default fallback
    }
  }

  // Conversational Chat Interface
  async sendConversationalMessage(
    message: string, 
    sessionId?: string, 
    conversationStage: string = 'design'
  ): Promise<{
    response: string;
    thinking?: string;
    conversation_stage: string;
    session_id: string;
    needs_approval: boolean;
    generated_verilog?: string;
    recommendations: string[];
    user_requirements_summary?: string;
  }> {
    try {
      //console.log('Sending conversational message:', { message, sessionId, conversationStage });
      //console.log('API URL:', `${API_BASE_URL}/v1/models/conversation`);
      
      const response = await fetch(`${API_BASE_URL}/v1/models/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          question: message,
          session_id: sessionId,
          conversation_stage: conversationStage
        }),
      });

      //console.log('API Response status:', response.status, response.statusText);
      //console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      //console.log('Conversation result:', result);
      return result;
    } catch (error) {
      console.error('Error in conversation:', error);
      
      // Enhanced error handling for different types of network errors
      if (error instanceof TypeError) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error: Unable to connect to the server. This might be due to CORS policy, SSL certificate issues, or the server being unreachable.');
        }
        if (error.message.includes('NetworkError')) {
          throw new Error('Network error: Please check your internet connection and try again.');
        }
      }
      
      throw new Error(`Failed to process conversation: ${error.message}`);
    }
  }

  // Clear conversation session
  async clearConversation(sessionId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/v1/models/conversation/${sessionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  }

  // Verilog Generation (Legacy - for backwards compatibility)
  async generateVerilog(prompt: string): Promise<{ response: string; thinking?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/models/verilog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: prompt }),
      });

      if (!response.ok) {
        throw new Error(`Verilog API error: ${response.statusText}`);
      }

      const data = await response.json();
      const fullResponse = data.answer || '';

      // Parse thinking and response
      if (fullResponse.includes('</think>')) {
        const parts = fullResponse.split('</think>', 2);
        return {
          thinking: parts[0].trim(),
          response: parts[1].trim()
        };
      }

      return { response: fullResponse };
    } catch (error) {
      console.error('Error generating Verilog:', error);
      throw new Error('Failed to generate Verilog code. Please try again.');
    }
  }

  // Cello Processing
  async processCello(verilogCode: string, ucfId: number): Promise<{
    output_files: string[];
    folder_name: string;
  }> {
    try {
      // http://localhost:8000/v1/run is the new url ( i had /v1/cello/process before)
      console.log('Processing with Cello:', { verilogCode, ucfId })
      const response = await fetch(`${CELLO_API_URL}/v1/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verilogCode: verilogCode,
          ucfIndex: ucfId,
          options: {
            verbose: true,
            log_overwrite: false,
            print_iters: false,
            exhaustive: false,
            test_configs: false
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Cello API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error processing with Cello:', error);
      throw new Error('Failed to process with Cello. Please try again.');
    }
  }

  // Get LLM Configuration
  async getLlmConfig(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/models/config`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Config API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting LLM config:', error);
      return null;
    }
  }

  // Update LLM Configuration
  async updateLlmConfig(config: {
    ucf_provider?: string;
    verilog_provider?: string;
  }): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/models/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Config update error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating LLM config:', error);
      throw new Error('Failed to update configuration. Please try again.');
    }
  }

  // Health Check with enhanced debugging
  async healthCheck(): Promise<boolean> {
    try {
      console.log('Testing connection to:', `${API_BASE_URL}/v1/models/health`);
      
      const response = await fetch(`${API_BASE_URL}/v1/models/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('Health check response:', response.status, response.statusText);
      console.log('Health check headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Health check data:', data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Test CORS and connectivity
  async testConnection(): Promise<{success: boolean, message: string, details?: any}> {
    try {
      console.log('=== Connection Test Started ===');
      console.log('Testing API Base URL:', API_BASE_URL);
      console.log('Testing Cello URL:', CELLO_API_URL);
      
      // Test health endpoint
      const healthResponse = await fetch(`${API_BASE_URL}/v1/models/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        return {
          success: true,
          message: 'Connection successful!',
          details: {
            status: healthResponse.status,
            data: healthData,
            headers: Object.fromEntries(healthResponse.headers.entries())
          }
        };
      } else {
        return {
          success: false,
          message: `Health check failed: ${healthResponse.status} ${healthResponse.statusText}`,
          details: {
            status: healthResponse.status,
            statusText: healthResponse.statusText,
            headers: Object.fromEntries(healthResponse.headers.entries())
          }
        };
      }
    } catch (error) {
      console.error('Connection test error:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        details: { error: error.toString() }
      };
    }
  }

  // Download File
  async downloadFile(folderName: string, fileName: string): Promise<Blob> {
    try {
      const response = await fetch(`${CELLO_API_URL}/v1/outputs/${folderName}/${fileName}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Download error: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file. Please try again.');
    }
  }

  // Extract Verilog Module from text
  extractVerilogModule(text: string): string | null {
    const moduleRegex = /module\s+.*?endmodule/gs;
    const match = text.match(moduleRegex);
    return match ? match[0].trim() : null;
  }

  // Format UCF name for API
  formatUcfName(ucfName: string): string {
    return ucfName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

export const apiService = new ApiService();
export default apiService;

