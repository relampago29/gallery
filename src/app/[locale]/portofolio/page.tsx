
import React from 'react'
 import NavBar from "@/components/shared/navbar/navbar";
import { useTranslations } from 'next-intl';


  
export default function portofolio() {
  const translate = useTranslations("portofolioPage");
  return (
    <div className="w-full">
      <NavBar></NavBar>
    </div>
  )
}


