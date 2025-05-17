import React, { useEffect, useState } from "react";
import { sanityClient } from "../../services/sanity";
import Skeleton from "react-loading-skeleton"; // Assumes this is installed
import "react-loading-skeleton/dist/skeleton.css";

const BlogImageGrid = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="px-2 mb-4 mt-2">
      <p className="text-xl font-medium mb-3 text-black font-ubuntu">
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
          : posts.map((post) => (
              <a
                href={`https://blog.shopmythrift.store/blog/${post.slug?.current}`}
                key={post.slug?.current}
              >
                <img
                  src={post.appImage?.asset?.url}
                  alt="Blog App Image"
                  style={{
                    width: "280px",
                    height: "auto",
                    borderRadius: "8px",
                    objectFit: "cover",
                  }}
                />
              </a>
            ))}
      </div>
    </div>
  );
};

export default BlogImageGrid;
 