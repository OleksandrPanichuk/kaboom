export const parseHeaders = (raw: string | undefined): Record<string, string> =>
  Object.fromEntries(
    (raw ?? "")
      .split(",")
      .map((pair) => pair.trim())
      .filter((pair) => pair.includes("="))
      .map((pair) => {
        const at = pair.indexOf("=");

        return [
          decodeURIComponent(pair.slice(0, at).trim()),
          decodeURIComponent(pair.slice(at + 1).trim()),
        ];
      }),
  );
