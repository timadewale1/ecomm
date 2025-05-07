import ImageKit from "imagekit";

export const ik = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
});

// This is where we force 1200×630, 1.91:1 center-crop
export function getOgImageUrl(src) {
  return ik.url({
    src,
    transformation: [
      {
        width: 1200,
        height: 630,
        aspectRatio: "1200:630",
        cropMode: "center"
      }
    ]
  });
}
