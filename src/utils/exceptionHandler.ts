import { ToastId, UseToastOptions } from "@chakra-ui/react";
import { TFunction } from "next-i18next";
import {
  ContractFunctionExecutionError,
  TransactionExecutionError,
} from "viem";

export async function showError(
  error: unknown,
  toast: (options?: UseToastOptions | undefined) => ToastId,
  t: TFunction
) {
  if (error instanceof ContractFunctionExecutionError) {
    const errorMsg =
      error.cause.shortMessage?.split("reason:")[1] ?? "Unexpected error";
    toast({
      title: `${t("contract_connect_failed")}: ${errorMsg}`,
      status: "error",
      isClosable: true,
    });
  } else if (error instanceof TransactionExecutionError) {
    toast({
      title: t("transaction_failed"),
      status: "error",
      isClosable: true,
    });
  } else if (error instanceof TypeError) {
    toast({
      title: t("server_api_error"),
      status: "error",
      isClosable: true,
    });
  } else {
    toast({
      title: t("unexpected_error"),
      status: "error",
      isClosable: true,
    });
  }
  console.log(error);
}
