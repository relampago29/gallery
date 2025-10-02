"use client";
import React from "react";
import EmailPasswordForm from "./EmailPasswordForm";

const CardAuth = () => {
  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title">Login</h2>
      </div>
      <div>
        <EmailPasswordForm></EmailPasswordForm>
      </div>
    </div>
  );
};

export default CardAuth;
