import { ApiResponse } from '../types';

const API_BASE_URL = 'http://134.199.140.227:8088'; // LLM Gateway
const CELLO_API_URL = 'http://134.199.140.227:8000'; // Cello API

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

  // Verilog Generation
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

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/models/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
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
