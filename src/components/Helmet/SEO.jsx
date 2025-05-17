import { Helmet } from "react-helmet-async";

const SEO = ({
  title = "My Thrift - The Real Marketplace", 
  description = "Shop pre-loved items at unbeatable prices.", 
  image = "/logo.ico", 
  url = "https://www.shopmythrift.store" 
}) => {
  

  return (
    <Helmet defer={false} key={title}>
      {/* Basic SEO Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="thrift, secondhand, deals, fashion, My Thrift" />
      <meta name="author" content="My Thrift" />

      <meta name="custom-test-meta" content="Helmet is injecting meta tags!" />

      {/*Tags to prevent meta tags from being cached*/}
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />


      {/* Open Graph (OG) Meta Tags for Facebook & LinkedIn */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="My Thrift" />

      {/* Twitter Meta Tags for Better Twitter Card Previews */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:creator" content="@mythriftng" />

      {/* Favicon (Optional) */}
      <link rel="icon" href="/logo.ico" type="image/x-icon" />
    </Helmet>
  );
};

export default SEO;
