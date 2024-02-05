import * as React from "react";
import { useFormState } from "react-dom";
import { type SerializeFrom } from "@remix-run/server-runtime";
import {
  useActionData,
  useFormAction,
  useNavigation,
  useSubmit,
} from "@remix-run/react";

let _hydrated = false;
export function useRouteFormAction<T>(
  preOptimism?: (formData: FormData) => void,
  postOptimism?: (result: SerializeFrom<T>) => void
): [
  Pick<React.FormHTMLAttributes<HTMLFormElement>, "encType" | "method"> & {
    action: string | ((formData: FormData) => void);
  },
  SerializeFrom<T> | undefined
] {
  const formAction = useFormAction();
  const actionData = useActionData<T>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [hydrated, setHydrated] = React.useState(_hydrated);
  const deferredsRef = React.useRef<
    {
      reject: (reason: unknown) => void;
      resolve: (result: unknown) => void;
    }[]
  >([]);

  React.useEffect(() => {
    if (hydrated) return;
    _hydrated = true;
    setHydrated(true);
  }, [hydrated]);

  // cleanup deferreds on unmount so the promises don't hang
  React.useEffect(
    () => () => {
      for (const deferred of deferredsRef.current) {
        deferred.reject(new Error("Form was unmounted."));
      }
      deferredsRef.current = [];
    },
    []
  );

  if (navigation.state === "idle" && typeof actionData !== "undefined") {
    for (const deferred of deferredsRef.current) {
      deferred.resolve(actionData);
    }
    deferredsRef.current = [];
  }

  const [formState, actionFunction] = useFormState<
    SerializeFrom<T> | undefined,
    FormData
  >(async (_, formData) => {
    await preOptimism?.(formData);

    const promise = new Promise<unknown>((resolve, reject) => {
      deferredsRef.current.push({ resolve, reject });
      submit(formData, {
        method: "POST",
        action: formAction,
        encType: "multipart/form-data",
        replace: true,
        unstable_viewTransition: true,
        unstable_flushSync: true,
      });
    });

    const result = (await promise) as SerializeFrom<T>;
    await postOptimism?.(result);
    return result;
  }, actionData as any);

  return [
    !hydrated
      ? { action: formAction, encType: "multipart/form-data", method: "POST" }
      : { action: actionFunction },
    formState,
  ];
}

