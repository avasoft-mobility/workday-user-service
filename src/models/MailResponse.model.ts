interface MailResponse {
  ResponseMetadata: { RequestId: string };
  MessageId: string;
}

export default MailResponse;
