import { useState } from "react";
import { cn } from "@/lib/utils";

interface CategoryOption {
  id: string;
  name: string;
  image: string;
  colorClass: string;
}

const categoryOptions: CategoryOption[] = [
  {
    id: "promocoes",
    name: "Promoções",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80",
    colorClass: "bg-category-pink",
  },
  {
    id: "super-restaurantes",
    name: "Super Restaurantes",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80",
    colorClass: "bg-category-red",
  },
  {
    id: "pizza",
    name: "Pizza",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80",
    colorClass: "bg-category-yellow",
  },
  {
    id: "lanches",
    name: "Lanches",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80",
    colorClass: "bg-category-orange",
  },
  {
    id: "japonesa",
    name: "Japonesa",
    image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200&q=80",
    colorClass: "bg-category-pink",
  },
  {
    id: "brasileira",
    name: "Brasileira",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80",
    colorClass: "bg-category-orange",
  },
  {
    id: "marmita",
    name: "Marmita",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80",
    colorClass: "bg-category-yellow",
  },
  {
    id: "acai",
    name: "Açaí",
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=200&q=80",
    colorClass: "bg-category-orange",
  },
  {
    id: "doces-bolos",
    name: "Doces & Bolos",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&q=80",
    colorClass: "bg-category-pink",
  },
  {
    id: "saudavel",
    name: "Saudável",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=80",
    colorClass: "bg-category-pink",
  },
  {
    id: "arabe",
    name: "Árabe",
    image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=200&q=80",
    colorClass: "bg-category-pink",
  },
  {
    id: "salgados",
    name: "Salgados",
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200&q=80",
    colorClass: "bg-category-red",
  },
  {
    id: "hot-dog",
    name: "Hot Dog",
    image: "https://images.unsplash.com/photo-1612392062631-94657e446179?w=200&q=80",
    colorClass: "bg-category-pink",
  },
  {
    id: "vegetariana",
    name: "Vegetariana",
    image: "https://images.unsplash.com/photo-1540914124281-342587941389?w=200&q=80",
    colorClass: "bg-category-orange",
  },
];

interface CategorySelectionGridProps {
  onSelect?: (categoryName: string) => void;
  selectedCategory?: string | null;
}

export function CategorySelectionGrid({ 
  onSelect, 
  selectedCategory 
}: CategorySelectionGridProps) {
  const [selected, setSelected] = useState<string | null>(selectedCategory || null);

  const handleSelect = (category: CategoryOption) => {
    setSelected(category.id);
    onSelect?.(category.name);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Categorias</h3>
      <div className="grid grid-cols-2 gap-4">
        {categoryOptions.map((category) => (
          <button
            key={category.id}
            onClick={() => handleSelect(category)}
            className={cn(
              "relative h-28 rounded-2xl overflow-hidden transition-all duration-200",
              "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
              category.colorClass,
              selected === category.id && "ring-4 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            {/* Category Name */}
            <span className="absolute top-3 left-3 font-bold text-lg text-white z-10 drop-shadow-md">
              {category.name}
            </span>

            {/* Food Image */}
            <img
              src={category.image}
              alt={category.name}
              className="absolute bottom-0 right-0 w-[55%] h-[85%] object-cover object-center rounded-tl-xl"
              loading="lazy"
            />

            {/* Subtle gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-transparent pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
}
