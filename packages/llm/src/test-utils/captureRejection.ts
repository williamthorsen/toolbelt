/** Returns the error with which a promise rejects, failing when it resolves. */
export async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('The promise resolved.');
}
