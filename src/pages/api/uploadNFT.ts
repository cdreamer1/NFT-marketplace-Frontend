import { NextRequest, NextResponse } from "next/server";
import { PINATA_API } from "@/constants/env";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb", // Set desired value here
    },
  },
  runtime: "experimental-edge",
};

// Migrated to Golang API
// Define the POST handler for the file upload
export default async function POST(req: NextRequest) {
  const formData1 = await req.formData();

  // Get the file from the form data
  const nftFile = formData1.get("nftFile");
  const nftName = formData1.get("nftName");
  const description = formData1.get("description");
  const mediaType = formData1.get("nftType");
  const royalty = formData1.get("royalty");

  // Check if files are received
  if (!nftFile) {
    // If no file is received, return a JSON response with an error and a 400 status code
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  // Check if name or symbol is received
  if (!nftName) {
    // If no file is received, return a JSON response with an error and a 400 status code
    return NextResponse.json({ error: "No name received." }, { status: 400 });
  }

  try {
    // Pinata
    const formDataForNFT = new FormData();
    formDataForNFT.append("file", nftFile);
    const pinataMetadata = JSON.stringify({
      name: Date.now().toString(),
    });
    formDataForNFT.append("pinataMetadata", pinataMetadata);
    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formDataForNFT.append("pinataOptions", pinataOptions);
    const resultForNFT = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        body: formDataForNFT,
        headers: {
          // 'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          Authorization: `Bearer ${PINATA_API}`,
        },
      }
    );
    const result = await resultForNFT.json();
    const CID = result.IpfsHash;
    const nftUrl = `ipfs://${CID}`;

    const metaData = JSON.stringify({
      pinataContent: {
        name: nftName,
        description: description,
        mediaType: mediaType,
        royalty: royalty,
        image: nftUrl,
      },
      pinataMetadata: {
        name: `NFT-${nftName}`,
      },
    });

    const resultForMeta = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_API}`,
        },
        body: metaData,
      }
    );
    const resultMeta = await resultForMeta.json();

    return NextResponse.json({ status: 200, ipfsPath: resultMeta });
  } catch (error) {
    console.log(error);
  }

  return NextResponse.json({ status: 200 });
}
