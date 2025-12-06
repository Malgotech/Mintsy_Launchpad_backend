# MSN Backend Service

This is the backend service for the MSN project.

## Installation

To get started, clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd msn-backend-service
npm install
```

## Usage

To run the service in development mode, use:

```bash
npm run dev
```

This will start the server with nodemon, which will automatically restart the server on file changes.

To build the project for production, use:

```bash
npm run build
```

To run the compiled code, use:

```bash
npm start
```

## Scripts

- `npm start`: Starts the server from the compiled `dist` directory.
- `npm run dev`: Starts the server in development mode with hot-reloading.
- `npm run build`: Compiles the TypeScript code to JavaScript.
- `npm test`: Runs the test suite.
- `npm run test:watch`: Runs the test suite in watch mode.
- `npm run test:coverage`: Generates a test coverage report.

## Dependencies

- [@coral-xyz/anchor](https://www.npmjs.com/package/@coral-xyz/anchor): Solana Anchor framework.
- [@prisma/client](https://www.npmjs.com/package/@prisma/client): Prisma client for database access.
- [@solana/web3.js](https://www.npmjs.com/package/@solana/web3.js): Solana web3 library.
- [cors](https://www.npmjs.com/package/cors): CORS middleware.
- [dotenv](https://www.npmjs.com/package/dotenv): Loads environment variables from a `.env` file.
- [express](https://www.npmjs.com/package/express): Web framework for Node.js.
- [pg](https://www.npmjs.com/package/pg): PostgreSQL client for Node.js.
- [reflect-metadata](https://www.npmjs.com/package/reflect-metadata): Required for TypeORM.
- [socket.io](https://www.npmjs.com/package/socket.io): Real-time engine.
- [typeorm](https://www.npmjs.com/package/typeorm): ORM for TypeScript and JavaScript.

## Dev Dependencies

- [@types/chai](https://www.npmjs.com/package/@types/chai): Type definitions for Chai.
- [@types/cors](https://www.npmjs.com/package/@types/cors): Type definitions for CORS.
- [@types/express](https://www.npmjs.com/package/@types/express): Type definitions for Express.
- [@types/jest](https://www.npmjs.com/package/@types/jest): Type definitions for Jest.
- [@types/supertest](https://www.npmjs.com/package/@types/supertest): Type definitions for Supertest.
- [chai](https://www.npmjs.com/package/chai): BDD / TDD assertion library.
- [cross-env](https://www.npmjs.com/package/cross-env): Cross-platform environment variables.
- [dotenv-cli](https://www.npmjs.com/package/dotenv-cli): CLI for dotenv.
- [jest](https://www.npmjs.com/package/jest): JavaScript testing framework.
- [nodemon](https://www.npmjs.com/package/nodemon): Automatically restarts the server on file changes.
- [prisma](https.npmjs.com/package/prisma): Prisma CLI.
- [supertest](https://www.npmjs.com/package/supertest): HTTP assertion library.
- [ts-jest](https://www.npmjs.com/package/ts-jest): TypeScript preprocessor for Jest.
- [ts-node](https://www.npmjs.com/package/ts-node): TypeScript execution environment for Node.js.
- [typescript](https://www.npmjs.com/package/typescript): TypeScript language.

## Running with Docker Compose

1. Build and start the backend and Postgres database:

```sh
docker-compose up --build
```

2. The backend will be available at http://localhost:3000 and Postgres at localhost:5432.

- The backend will automatically connect to the Postgres container using the connection string set in the environment.
- Data will persist in a Docker volume named `postgres_data`.

3. To stop and remove containers, networks, and volumes:

```sh
docker-compose down -v
```