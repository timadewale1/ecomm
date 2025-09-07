import React, { useEffect, useState } from "react";
import { sanityClient } from "../../services/sanity";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import IframeModal from "../PwaModals/PushNotifsModal";

const BlogImageGrid = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalUrl, setModalUrl] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Control sizes here
  const CARD_WIDTH = 500;   // increase width
  const CARD_HEIGHT = 260;  // increase height

  useEffect(() => {
    const query = `*[_type == "post"]{
      slug,
      appImage {
        asset->{ url }
      }
    }`;

    sanityClient
      .fetch(query)
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Sanity fetch error:", err);
        setPosts([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const openModal = (slug) => {
    setModalUrl(`https://blog.shopmythrift.store/blog/${slug}?embed=1`);
    setShowModal(true);
  };

  return (
    <>
      <div className="px-2 mb-4 overflow-x-hidden mt-6">
        <div className="h-1.5 mb-4 bg-gray-50 w-[100vw] relative left-1/2 -translate-x-1/2" />

        <p className="text-xl font-semibold mb-3 text-black font-opensans">
          Read our Blogs 📰
        </p>

        <div className="flex overflow-x-auto space-x-4 scrollbar-hide pb-1">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="shrink-0"
                  style={{ width: CARD_WIDTH }}
                >
                  <Skeleton
                    height={CARD_HEIGHT}
                    width={CARD_WIDTH}
                    style={{ borderRadius: 12 }}
                  />
                </div>
              ))
            : posts.map((post) => {
                const slug = post.slug?.current;
                const imgUrl = post.appImage?.asset?.url;
                if (!slug) return null;

                return (
                  <div
                    key={slug}
                    className="shrink-0"                    // stop flex from squashing the card
                    style={{ width: CARD_WIDTH }}            // reserve the width
                  >
                    <button
                      onClick={() => openModal(slug)}
                      className="focus:outline-none block"
                      style={{
                        padding: 0,
                        width: "100%",
                        height: CARD_HEIGHT,                 // fixed height
                      }}
                      aria-label="Open blog preview"
                    >
                      <img
                        src={imgUrl}
                        alt="Blog App Image"
                        loading="lazy"
                        draggable={false}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 12,
                          objectFit: "cover",                 // fill the card without distortion
                          objectPosition: "center",
                          display: "block",
                        }}
                      />
                    </button>

                    <noscript>
                      <a
                        href={`https://blog.shopmythrift.store/blog/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Read post
                      </a>
                    </noscript>
                  </div>
                );
              })}
        </div>

        <IframeModal
          show={showModal}
          onClose={() => setShowModal(false)}
          url={modalUrl}
        />

        <div className="h-1.5 bg-gray-50 w-[100vw] relative mt-4 left-1/2 -translate-x-1/2" />
      </div>
    </>
  );
};

export default BlogImageGrid;
