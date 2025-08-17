import Image from "next/image";
import styles from "./page.module.css";
import Link from "next/link";
import ProductCard from "./components/ProductCard";
import Showimages from "./components/ShowImages";
import AuthForm from "./components/AuthForm";



export default function Home() {
  return (
    <main>
      <h1>Hwllo wordld</h1>
      <Link href="/users">Users</Link>     
      <ProductCard></ProductCard>
    
      <h1>Bem-vindo!</h1>
      <AuthForm />
    
      <Showimages></Showimages>
    </main>
  );
}
