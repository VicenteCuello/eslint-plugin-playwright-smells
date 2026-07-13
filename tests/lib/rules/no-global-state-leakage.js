"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-global-state-leakage");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-global-state-leakage", rule, {
  valid: [
    {
      name: "Valid use: Global declaration, but safe instantiation in beforeEach",
      code: `
        import { test } from '@playwright/test';
        
        let adminUser;
        test.beforeEach(async () => {
          adminUser = new UserClass(); 
        });
        test('scenario 1', async () => {
           await adminUser.login();
        });
      `,
    },
    {
      name: "Valid use: Completely local state usage",
      code: `
        import { test, expect } from '@playwright/test';
        
        test('create user', async () => { 
          let userId = await api.createUser();
          expect(userId).toBeDefined();
        }); 
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Risky static initialization outside of hooks",
      code: `
        import { test } from '@playwright/test';
        
        const mockServer = new MockServer();
        test('scenario 1', async () => {
          mockServer.start();
        });
      `,
      errors: [{ messageId: "globalInstantiation", data: { name: "MockServer" } }]
    },
    {
      name: "Code smell: Inter-test state leakage by mutating a global variable",
      code: `
        import { test } from '@playwright/test';
        
        let sharedId; 
        
        test('create user', async ({ request }) => { 
          sharedId = 123; // Mutation
        }); 
        
        test('delete user', async ({ request }) => { 
          await request.delete('/api/users/' + sharedId);
        });
      `,
      errors: [{ messageId: "interTestDependency", data: { name: "sharedId" } }]
    }
  ]
});