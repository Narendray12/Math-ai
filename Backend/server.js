const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

class ImageAnalyzer {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  prepareBase64Image(base64Url) {
    return base64Url.split(',')[1];
  }

  generatePrompt(dictOfVars) {
    return `Analyze the mathematical expression in this image.
Your response MUST be in this EXACT format (no other text, just the JSON array):
[{
  "expr": "the expression you see",
  "result": "the calculated result",
  "assign": false
}]

For equations with variables return like this:
[{
  "expr": "x",
  "result": "2",
  "assign": true
}, {
  "expr": "y",
  "result": "5",
  "assign": true
}]

Here are the variable values if needed: ${JSON.stringify(dictOfVars)}

Rules:
1. For simple math (2+2): Return [{"expr": "2+2", "result": "4", "assign": false}]
2. For equations (x^2+2x+1=0): Return array of solutions with assign:true
3. For variable assignments (x=4): Return with assign:true
4. For word problems: Return [{"expr": "problem description", "result": "answer", "assign": false}]
5. For abstract concepts: Return [{"expr": "description", "result": "concept", "assign": false}]

IMPORTANT: Response must be valid JSON. No explanation text, ONLY the JSON array.`;
  }

  cleanResponse(text) {
    try {
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']') + 1;
      if (start === -1 || end === 0) return null;
      
      const jsonPart = text.substring(start, end);
      return JSON.parse(jsonPart);
    } catch (error) {
      console.error('Error in cleanResponse:', error);
      return null;
    }
  }

  async analyzeImage(base64Image, dictOfVars = {}) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: "image/png"
        }
      };

      const prompt = this.generatePrompt(dictOfVars);
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      console.log('Raw response:', text);
      const answers = this.cleanResponse(text);
      
      if (!answers) {
        return [{
          expr: "Error processing image",
          result: "Could not analyze the image",
          assign: false
        }];
      }

      return answers.map(answer => ({
        ...answer,
        assign: answer.assign || false
      }));

    } catch (error) {
      console.error('Error in analyzeImage:', error);
      return [{
        expr: "Error",
        result: error.message,
        assign: false
      }];
    }
  }
}

const app = express();
app.use(cors());

app.use(express.json({ limit: '50mb' }));

const analyzer = new ImageAnalyzer(process.env.GEMINI_KEY);

app.post('/calculate', async (req, res) => {
    try {
      const { image, dict_of_vars } = req.body;
  
      if (!image) {
        return res.status(400).json([{
          expr: "Error",
          result: "No image provided",
          assign: false
        }]);
      }
  
      const base64Image = analyzer.prepareBase64Image(image);
      const results = await analyzer.analyzeImage(base64Image, dict_of_vars || {});
      
      // Ensure we always return an array
      if (!Array.isArray(results)) {
        return res.status(500).json([{
          expr: "Error",
          result: "Invalid response format",
          assign: false
        }]);
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json([{
        expr: "Error",
        result: error.message || "An unknown error occurred",
        assign: false
      }]);
    }
  });

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json([{
    expr: "Server Error",
    result: err.message,
    assign: false
  }]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
