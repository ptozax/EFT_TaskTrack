import React from "react";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";

const Home = () => {
  return (
    <div className="container py-5">
      {/* Header */}
      <motion.div
        className="text-center mb-5"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="display-4 fw-bold text-primary">EFT TaskTrack</h1>
        <p className="lead text-muted">I don't know why but ok we do it!</p>
      </motion.div>

    </div>
  );
};

export default Home;
