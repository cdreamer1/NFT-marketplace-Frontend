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
  const bannerFile = formData1.get("bannerFile");
  const iconFile = formData1.get("iconFile");
  const collection_name = formData1.get("name");
  const collection_symbol = formData1.get("symbol");
  const collection_description = formData1.get("description");

  // Check if files are received
  if (!bannerFile || !iconFile) {
    // If no file is received, return a JSON response with an error and a 400 status code
    return NextResponse.json({ error: "No files received." }, { status: 400 });
  }

  // Check if name or symbol is received
  if (!collection_name || !collection_symbol) {
    // If no file is received, return a JSON response with an error and a 400 status code
    return NextResponse.json(
      { error: "No name or symbol received." },
      { status: 400 }
    );
  }

  try {
    // Pinata
    const formDataForBannerImage = new FormData();
    formDataForBannerImage.append("file", bannerFile);
    const pinataMetadata = JSON.stringify({
      name: Date.now().toString(),
    });
    formDataForBannerImage.append("pinataMetadata", pinataMetadata);
    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formDataForBannerImage.append("pinataOptions", pinataOptions);
    const resultForImage = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        body: formDataForBannerImage,
        headers: {
          // 'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          Authorization: `Bearer ${PINATA_API}`,
        },
      }
    );
    const resultImage = await resultForImage.json();
    const CID = resultImage.IpfsHash;
    const bannerImageIpfsPath = `ipfs://${CID}`;

    const formDataForIconImage = new FormData();
    formDataForIconImage.append("file", iconFile);
    const pinataMetadata1 = JSON.stringify({
      name: Date.now().toString(),
    });
    formDataForIconImage.append("pinataMetadata", pinataMetadata1);
    const pinataOptions1 = JSON.stringify({
      cidVersion: 0,
    });
    formDataForIconImage.append("pinataOptions", pinataOptions1);
    const resultForImage1 = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        body: formDataForIconImage,
        headers: {
          // 'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          Authorization: `Bearer ${PINATA_API}`,
        },
      }
    );
    const resultImage1 = await resultForImage1.json();
    const CID1 = resultImage1.IpfsHash;
    const iconImageIpfsPath = `ipfs://${CID1}`;

    const metaData = JSON.stringify({
      pinataContent: {
        name: collection_name,
        symbol: collection_symbol,
        description: collection_description,
        banner: bannerImageIpfsPath,
        icon: iconImageIpfsPath,
      },
      pinataMetadata: {
        name: `Collection-${collection_name}`,
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
