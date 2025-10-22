"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import CardAuth from "@/components/ui/auth/CardAuth";
import NavBar from "@/components/shared/navbar/navbar";
import Hero from "@/components/hero/hero";


export default function Home() {
 
  return (
    <div className="w-full">
      <NavBar></NavBar>
      <Hero></Hero>
    </div>
  );
}

/*  <CardAuth>
    </CardAuth> */
