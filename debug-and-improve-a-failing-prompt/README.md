## Notes

- Use Ask AI and paste the JSON generated
- The task is well explained in the question, so, it was able to provide accurate answers

## Sample solution

```
{
  "problems": [
    "Problem 1: The prompt does not define an exact JSON structure, so the AI may return inconsistent field names and formats.",
    "Problem 2: It does not explain how to handle missing information such as salary or location.",
    "Problem 3: The task is too vague and does not clearly define what should be extracted or how to identify it.",
    "Problem 4: No examples are provided, so the AI must guess the desired output format.",
    "Problem 5: No edge-case handling is included for remote jobs, salary ranges, or incomplete job descriptions."
  ],
  "improvedPrompt": "You are an information extraction assistant. Extract job posting information from the provided job description and return ONLY valid JSON.\\n\\nRequired JSON schema:\\n{\\n  \"title\": string | null,\\n  \"salary\": string | null,\\n  \"location\": string | null\\n}\\n\\nRules:\\n1. Extract the job title, salary, and location if they are explicitly mentioned.\\n2. If a field is missing, return null.\\n3. Preserve salary ranges exactly as written.\\n4. If the job is remote, include 'Remote' in the location field.\\n5. Do not infer or invent information that is not present in the text.\\n6. Return JSON only. No explanations, markdown, or extra text.\\n\\nExample 1:\\nInput: 'Software Engineer. Salary: $100k. New York, NY.'\\nOutput:\\n{\\n  \"title\": \"Software Engineer\",\\n  \"salary\": \"$100k\",\\n  \"location\": \"New York, NY\"\\n}\\n\\nExample 2:\\nInput: 'Marketing Manager needed. Remote role.'\\nOutput:\\n{\\n  \"title\": \"Marketing Manager\",\\n  \"salary\": null,\\n  \"location\": \"Remote\"\\n}\\n\\nNow extract information from this job description:\\n[text]",
  "improvements": [
    "Added a strict JSON schema so the output format is always consistent.",
    "Specified that missing values must be returned as null instead of being omitted or guessed.",
    "Added clear extraction rules so the AI understands exactly what information to retrieve.",
    "Included examples showing the desired input-to-output behavior.",
    "Added edge-case handling for remote positions and missing salary information.",
    "Required JSON-only output to prevent extra explanations or formatting."
  ]
}
```