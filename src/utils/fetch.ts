import { BACKEND_HOST } from "@/constants/env";
import { PINATA_GATEWAY, PINATA_GATEWAY_API } from "@/constants/env";
import { UserInfoType } from "@/lib/types";

export async function fetchUserList(): Promise<Array<UserInfoType>> {
  try {
    const res_userlist = await fetch(`${BACKEND_HOST}api/user_list`, {
      method: "GET",
    });
    const json_userlist: UserInfoType[] =
      res_userlist.status === 200 ? await res_userlist.json() : [];
    return json_userlist.map((elem) => {
      return {
        ...elem,
        AvatarImage: generateIPFSURL(elem.AvatarImage || "", 40, 40, "cover"),
      };
    });
  } catch (error) {
    console.log(error);
    return [];
  }
}

export function generateIPFSURL(
  ipfs: string,
  width?: number,
  height?: number,
  fit?: string
) {
  return ipfs && ipfs.startsWith("ipfs://")
    ? ipfs
        .replace("ipfs://", PINATA_GATEWAY)
        .concat(
          "?pinataGatewayToken=",
          PINATA_GATEWAY_API,
          width ? `&img-width=${width}` : "",
          height ? `&img-height=${height}` : "",
          fit ? `&img-fit=${fit}` : ""
        )
    : "";
}
