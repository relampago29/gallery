"use client";

import React from "react";
import NavBar from "@/components/shared/navbar/navbar";
import Hero from "@/components/hero/hero";
import LazyPortfolio from "@/components/sections/portofolio/LazyPortfolio";
import TeamHomePage from "@/components/sections/team/teamHomePage";
import Contact from "@/components/sections/conatct/Contact";


export default function Home() {
 
  return (
    <div className="w-full">
      <NavBar></NavBar>
      <Hero></Hero>
      <LazyPortfolio/>
      <TeamHomePage/>
      <Contact/>
    </div>
  );
}


