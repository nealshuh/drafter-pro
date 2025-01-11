import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

const API_ENDPOINTS = {
  claude: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
  together: 'https://api.together.xyz/v1/chat/completions'
}

// Call Claude API through Supabase Edge Function
export const callClaudeAPI = async (prompt, options = {}) => {
  try {
    const { data, error } = await supabase.functions.invoke('call-llm', {
      body: {
        provider: 'claude',
        prompt,
        model: options.model || 'claude-3-opus-20240229',
        max_tokens: options.max_tokens || 1024,
        temperature: options.temperature || 0.7
      }
    })

    if (error) throw error

    return data.message

  } catch (error) {
    console.error('Error calling Claude API via Supabase:', error)
    throw new Error(error.message || 'Failed to call Claude API')
  }
}
  
// OpenAI API caller
export const callOpenAIAPI = async (prompt, model = 'gpt-3.5-turbo') => {
  try {
    const { data, error } = await supabase.functions.invoke('call-llm', {
      body: {
        provider: 'openai',
        prompt,
        model: model,
        max_tokens: 150,
        temperature: 0.7
      }
    })

    if (error) throw error

    return data.message

  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    throw error
  }
}

// Together AI API caller
export const callTogetherAPI = async (prompt, model = 'meta-llama/Llama-3-70b-chat-hf') => {
  try {
    const { data, error } = await supabase.functions.invoke('call-llm', {
      body: {
        provider: 'together',
        prompt,
        model: model,
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1
      }
    })

    if (error) throw error

    return data.message

  } catch (error) {
    console.error('Error calling Together API:', error)
    throw error
  }
}