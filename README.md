# IF Automation Test

## Prerequisites

- Node.js (Latest LTS version recommended)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/0xPew/if-automation-test.git
cd if-automation-test
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Then edit the `.env` file with your configuration.

## Running Tests

To run all tests:

```bash
npx playwright test
```

To run a specific test file:

```bash
npx playwright test tests/[test-file-name].spec.js
```

## Test Reports

After running tests, to view test results, run:

```bash
npx playwright show-report
```
