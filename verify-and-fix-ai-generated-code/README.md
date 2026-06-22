## Notes

- LLM is capable of identifying the bugs and testing the code with edge cases
- So use Ask AI and get the task done

## Sample solution

```
{
  "bugs": [
    "Bug 1: The code uses the simple interest formula instead of the compound interest formula.",
    "Bug 2: The code never applies compounding by raising the growth factor to the power of time.",
    "Bug 3: The implementation does not correctly model compound-interest edge cases and relies on a simple-interest calculation."
  ],
  "fixedCode": "function compoundInterest(principal, rate, time) { return principal * Math.pow(1 + rate / 100, time); }",
  "testStrategy": "I would test the provided test cases first to verify correctness. Then I would test edge cases such as a 0% interest rate, 0 years, very small values, and large values. I would compare outputs against the mathematical compound interest formula P*(1+r/100)^t. I would also add unit tests for each scenario, including negative and invalid inputs if the requirements allow them, to ensure the function behaves correctly under all expected conditions."
}
```
