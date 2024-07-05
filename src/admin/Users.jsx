import React from "react";
import { Container, Row, Col } from "reactstrap";
import useGetData from "../custom-hooks/useGetData";
import { motion } from "framer-motion";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import { toast } from "react-toastify";
import { getAuth, deleteUser as deleteAuthUser } from "firebase/auth";

const Users = () => {
  const { data: usersData, loading } = useGetData("users");

  const deleteUser = async (id, email) => {
    try {
      // Delete the user from Firestore
      await deleteDoc(doc(db, "users", id));

      // Delete the user from Firebase Authentication
      const auth = getAuth();
      const user = await auth.currentUser;

      // Check if the user is authenticated and matches the email
      if (user && user.email === email) {
        await deleteAuthUser(user);
      }

      toast.success("User deleted");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error deleting user");
    }
  };

  return (
    <section>
      <Container>
        <Row>
          <Col lg="12">
            <h4 className="fw-bold">Users</h4>
          </Col>
          <Col lg="12" className="pt-5">
            <table className="table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <h5 className="pt-5 fw-bold">Loading...</h5>
                ) : (
                  usersData?.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <img src={user.photoURL} alt="" />
                      </td>
                      <td>{user.displayName}</td>
                      <td>{user.email}</td>
                      <td>
                        <motion.button
                          whileTap={{ scale: 1.2 }}
                          onClick={() => {
                            deleteUser(user.id);
                          }}
                          className="btn btn-danger"
                        >
                          Delete
                        </motion.button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Users;
