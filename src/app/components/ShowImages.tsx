import React from 'react'

interface Image {
  id: number;
  links:{
    photos:string
  }
}

const ShowImages = async () => {
  const res = await fetch('https://api.unsplash.com/photos/random', { cache: 'no-store' });
  const users: Image[] = await res.json();

  return (
    <div>
      <div className="image">
        <div className="gridImage">
          {Array.isArray(users) && users.map((img: Image) => (
            <img
              key={img.id}
              src={img.links.photos}
              style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: '8px', margin: '4px' }}
            />
          ))}
        </div>
      </div>
    
    </div>
  );
}

export default ShowImages
