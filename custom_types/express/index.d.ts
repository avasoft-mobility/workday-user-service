declare global {
  namespace express {
    interface Express {
      runMiddleware?: Function;
    }
  }
}

export {};
