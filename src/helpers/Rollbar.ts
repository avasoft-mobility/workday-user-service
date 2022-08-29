import Rollbar from "rollbar";
var rollbar = new Rollbar({
  accessToken: "e84d1c74c2d04acaa09b157f35c098d9",
  captureUncaught: true,
  captureUnhandledRejections: true,
});

export { rollbar as Rollbar };
