type Services = "Mobile" | "Attendance" | "Todos" | "Reports" | "Users";
const region = process.env.AWS_REGION || "us-west-2";
const Lambda = require("aws-sdk/clients/lambda");

class LambdaClient {
  private baseUrl: string;
  private FunctionName: string;
  private lambda: any;

  constructor(service: Services) {
    this.baseUrl = this.getBaseUrl(service);
    this.FunctionName = this.getFunctionName(service);
    this.lambda = new Lambda({
      region,
      endpoint: this.baseUrl,
    });
  }

  private getBaseUrl = (service: Services): string => {
    if (service === "Mobile") {
      return `${process.env.LAMBDA_BASE_URL}/mobile`;
    }

    if (service === "Attendance") {
      return `${process.env.LAMBDA_BASE_URL}/attendance`;
    }

    if (service === "Reports") {
      return `${process.env.LAMBDA_BASE_URL}/reports`;
    }

    if (service === "Todos") {
      return `${process.env.LAMBDA_BASE_URL}/todos`;
    }

    if (service === "Users") {
      return `${process.env.LAMBDA_BASE_URL}/users`;
    }

    return `${process.env.LAMBDA_BASE_URL}`;
  };

  private getFunctionName = (service: Services): string => {
    const functionNames = JSON.parse(process.env.LAMBDA_FUNCTION_NAMES!);

    if (service === "Mobile") {
      return functionNames.MOBILE;
    }

    if (service === "Attendance") {
      return functionNames.ATTENDANCE;
    }

    if (service === "Reports") {
      return functionNames.REPORTS;
    }

    if (service === "Todos") {
      return functionNames.TODOS;
    }

    if (service === "Users") {
      return functionNames.USERS;
    }

    return functionNames.TODOS;
  };

  get = async (route: string, queryParams?: Object) => {
    try {
      const Payload = {
        httpMethod: "GET",
        path: route,
        headers: {
          "content-type": "application/json",
        },
        queryParams: queryParams ? queryParams : {},
        isBase64Encoded: false,
      };
      const response = await this.lambda
        .invoke({
          Payload: JSON.stringify(Payload),
          FunctionName: this.FunctionName,
        })
        .promise();
      return JSON.parse(response.Payload);
    } catch (error) {
      return null;
    }
  };

  post = async (route: string, queryParams?: Object, body?: Object) => {
    try {
      const Payload = {
        httpMethod: "POST",
        path: route,
        headers: { "content-type": "application/json" },
        queryParams: queryParams ? queryParams : {},
        isBase64Encoded: false,
        body: body ? body : {},
      };

      const response = await this.lambda
        .invoke({
          Payload: JSON.stringify(Payload),
          FunctionName: this.FunctionName,
        })
        .promise();
      return JSON.parse(response.Payload);
    } catch (error) {
      return null;
    }
  };

  put = async (route: string, queryParams?: Object, body?: Object) => {
    try {
      const Payload = {
        httpMethod: "PUT",
        path: route,
        headers: { "content-type": "application/json" },
        queryParams: queryParams ? queryParams : {},
        isBase64Encoded: false,
        body: body ? body : {},
      };

      const response = await this.lambda
        .invoke({
          Payload: JSON.stringify(Payload),
          FunctionName: this.FunctionName,
        })
        .promise();
      return JSON.parse(response.Payload);
    } catch (error) {
      return null;
    }
  };

  delete = async (route: string, queryParams?: Object, body?: Object) => {
    try {
      const Payload = {
        httpMethod: "DELETE",
        path: route,
        headers: { "content-type": "application/json" },
        queryParams: queryParams ? queryParams : {},
        isBase64Encoded: false,
        body: body ? body : {},
      };

      const response = await this.lambda
        .invoke({
          Payload: JSON.stringify(Payload),
          FunctionName: this.FunctionName,
        })
        .promise();

      return JSON.parse(response.Payload);
    } catch (error) {
      return null;
    }
  };
}

export default LambdaClient;
