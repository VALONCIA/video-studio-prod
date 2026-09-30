export function createSignedMediaRefresh(refetchOwner: () => Promise<unknown>) {
  let used = false;
  let pending: Promise<boolean> | undefined;
  return {
    async onAuthorizationFailure(): Promise<boolean> {
      if (pending) return pending;
      if (used) return false;
      used = true;
      pending = refetchOwner()
        .then(
          () => true,
          () => false,
        )
        .finally(() => {
          pending = undefined;
        });
      return pending;
    },
    resetForNewMedia() {
      used = false;
    },
  };
}
