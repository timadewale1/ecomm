import React, { useState } from "react";
import CommunityInviteModal from "./CommunityInviteModal";

const WithCommunityModal = ({ children }) => {
  const [showModal, setShowModal] = useState(true);
  console.log("Community Modal rendered");

  return (
    <>
      {children}
      {showModal && (<CommunityInviteModal onClose={
        () => setShowModal(false)} />)}
    </>
  );
};

export default WithCommunityModal;
