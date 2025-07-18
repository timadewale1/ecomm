import React, { useEffect, useState } from "react";
import { sanityClient } from "../../services/sanity";
import Skeleton from "react-loading-skeleton"; // Assumes this is installed
import "react-loading-skeleton/dist/skeleton.css";
import IframeModal from "../PwaModals/PushNotifsModal";
const BlogImageGrid = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalUrl, setModalUrl] = useState("");
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    const query = `*[_type == "post"]{
      slug,
      appImage {
        asset->{
          url
        }
      }
    }`;

    sanityClient
      .fetch(query)
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Sanity fetch error:", err);
        setPosts([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);
  const openModal = (slug) => {
    setModalUrl(`https://blog.shopmythrift.store/blog/${slug}?embed=1`);
    setShowModal(true);
  };
  return (
    <div className="px-2 mb-4 mt-6">
      <p className="text-xl font-semibold mb-3 text-black font-opensans">
        Read our Blogs
      </p>

      <div className="flex overflow-x-auto space-x-4 scrollbar-hide">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                height={180}
                width={280}
                style={{ borderRadius: 8 }}
              />
            ))
          : posts.map((post) => {
              const slug = post.slug?.current;
              const imgUrl = post.appImage?.asset?.url;

              return (
                <div key={slug}>
                  {/* Opens iframe modal; preserves styles */}
                  <button
                    onClick={() => openModal(slug)}
                    className="focus:outline-none"
                    style={{ padding: 0 }} /* keeps layout identical */
                  >
                    <img
                      src={imgUrl}
                      alt="Blog App Image"
                      style={{
                        width: "280px",
                        height: "auto",
                        borderRadius: "8px",
                        objectFit: "cover",
                      }}
                    />
                  </button>

                  {/* Fallback for users with JS disabled */}
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
    </div>
  );
};

export default BlogImageGrid;
