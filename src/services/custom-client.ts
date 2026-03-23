import Axios, { AxiosError, type AxiosRequestConfig } from "axios";

export const AXIOS_INSTANCE = Axios.create({
  baseURL: "https://api-tap-fun-hedera.nysm.work/",
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const storageAddress = localStorage.getItem("wallet-address");
  if (storageAddress) {
    config.headers["wallet-address"] = storageAddress;
  }

  return config;
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor to handle 401 unauthorized
AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Check if response status is 401
    if (error.response?.status === 401) {
      // Clear authentication data from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("wallet-address");

        // Dispatch custom event for components to handle logout
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
    }

    return Promise.reject(error);
  },
);

type CustomClientConfig = AxiosRequestConfig & {
  body?: unknown;
};
type CancellablePromise<T> = Promise<T> & { cancel?: () => void };

const mapRequestBodyToData = (
  config?: CustomClientConfig,
): AxiosRequestConfig | undefined => {
  if (!config) return undefined;

  const { body, ...restConfig } = config;

  return body !== undefined ? { ...restConfig, data: body } : restConfig;
};

export const customClient = <T>(
  config: CustomClientConfig,
  options?: CustomClientConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const requestConfig = mapRequestBodyToData(config);
  const requestOptions = mapRequestBodyToData(options);

  const promise = AXIOS_INSTANCE({
    ...requestConfig,
    ...requestOptions,
    headers: {
      ...(requestConfig?.headers ?? {}),
      ...(requestOptions?.headers ?? {}),
    },
    cancelToken: source.token,
  }).then(({ data }) => data) as CancellablePromise<T>;

  promise.cancel = () => {
    source.cancel("Query was cancelled");
  };

  return promise;
};

// In some case with react-query and swr you want to be able to override the return error type so you can also do it here like this
export type ErrorType<Error> = AxiosError<Error>;

export type BodyType<BodyData> = BodyData;
