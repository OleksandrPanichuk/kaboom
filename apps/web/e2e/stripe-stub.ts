export const installStripeStub = () => {
  const noop = () => undefined;
  const resolved =
    <T>(value: T) =>
    () =>
      Promise.resolve(value);

  const element = (type: string) => {
    const handlers: Record<string, Array<(event: unknown) => void>> = {};
    let node: HTMLElement | null = null;
    const self = {
      mount: (target: string | HTMLElement) => {
        node =
          typeof target === "string"
            ? document.querySelector<HTMLElement>(target)
            : target;

        if (node) {
          node.innerHTML =
            type === "address"
              ? "<p>Billing address</p>"
              : "<p>Card number</p><p>Expiration date</p>";
        }

        window.setTimeout(() => {
          for (const handler of handlers.ready ?? []) {
            handler({ elementType: type });
          }
        }, 30);
      },
      on: (event: string, handler: (event: unknown) => void) => {
        (handlers[event] ??= []).push(handler);

        return self;
      },
      once: (event: string, handler: (event: unknown) => void) =>
        self.on(event, handler),
      off: () => self,
      update: noop,
      destroy: () => {
        if (node) node.innerHTML = "";
      },
      unmount: noop,
      focus: noop,
      blur: noop,
      clear: noop,
      collapse: noop,
      getValue: resolved({
        complete: true,
        isNewAddress: true,
        value: {
          name: "Ada Lovelace",
          address: {
            line1: "1 Analytical Way",
            line2: null,
            city: "London",
            state: null,
            postal_code: "N1 7AA",
            country: "GB",
          },
        },
      }),
    };

    return self;
  };

  const stripe = () => {
    const created: Record<string, ReturnType<typeof element>> = {};
    const elements = {
      create: (type: string) => (created[type] = element(type)),
      getElement: (type: string) => created[type] ?? null,
      update: noop,
      on: noop,
      submit: resolved({}),
      fetchUpdates: resolved({}),
    };

    return {
      elements: () => elements,
      createToken: noop,
      createPaymentMethod: noop,
      confirmCardPayment: noop,
      confirmPayment: resolved({ paymentIntent: { status: "succeeded" } }),
      confirmSetup: resolved({ setupIntent: { status: "succeeded" } }),
      registerAppInfo: noop,
      _registerWrapper: noop,
    };
  };

  Object.assign(window, { Stripe: Object.assign(stripe, { version: 3 }) });
};
