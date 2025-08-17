import Image from "next/image";
import styles from "./page.module.css";
import Link from "next/link";
import ProductCard from "./components/ProductCard";
import Showimages from "./components/ShowImages";


export default function Home() {
  return (
    <main>
      <h1>Hwllo wordld</h1>
      <Link href="/users">Users</Link>     
      <ProductCard></ProductCard>
      <Showimages></Showimages>
    </main>
  );
}
