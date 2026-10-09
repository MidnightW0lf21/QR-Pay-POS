"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";
import { useState, useEffect } from "react";
import { saveImage, getImage } from "@/lib/db";
import { uploadProductImage, compressImageToDataUrl } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import { Tag, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { type Product, getProductCategories } from "@/lib/types";
import { generateUUID, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Název musí mít alespoň 2 znaky." }),
  price: z.coerce.number().int({ message: "Cena musí být celé číslo." }).positive({ message: "Cena musí být kladné číslo." }),
  costPrice: z.coerce.number().int({ message: "Nákupní cena musí být celé číslo." }).min(0, { message: "Nákupní cena musí být nezáporné číslo." }),
  stock: z.coerce.number().int({ message: "Sklad musí být celé číslo." }).min(0, { message: "Sklad musí být nezáporné číslo." }),
  category: z.string().optional(),
  categories: z.array(z.string()).default([]),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  onSubmit: (data: Omit<Product, 'id'> | Product) => Promise<void> | void;
  product?: Product | null;
  categories: string[];
}

export default function ProductForm({ onSubmit, product, categories }: ProductFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialCategories = product ? getProductCategories(product) : [];

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      price: product?.price || 0,
      costPrice: product?.costPrice || 0,
      stock: product?.stock || 0,
      category: initialCategories[0] || "",
      categories: initialCategories,
      imageUrl: product?.imageUrl || "",
    },
  });

  useEffect(() => {
    if (product) {
      const cats = getProductCategories(product);
      form.reset({
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        stock: product.stock,
        category: cats[0] || "",
        categories: cats,
        imageUrl: product.imageUrl || "",
      });
    }
  }, [product, form]);

  useEffect(() => {
    async function loadInitialImage() {
      if (product?.imageUrl) {
        if (product.imageUrl.startsWith('data:')) {
          setImagePreview(product.imageUrl);
        } else if (product.imageUrl.startsWith('img_')) {
          const storedImage = await getImage(product.imageUrl);
          if (storedImage) {
            setImagePreview(storedImage);
          }
        } else {
           setImagePreview(product.imageUrl);
        }
      }
    }
    loadInitialImage();
  }, [product]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "Soubor je příliš velký",
          description: "Prosím nahrajte obrázek menší než 5MB.",
        });
        return;
      }
      setSelectedFile(file);
      try {
        const squareDataUrl = await compressImageToDataUrl(file);
        setImagePreview(squareDataUrl);
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      let imageUrl = product?.imageUrl || "";

      if (selectedFile) {
        const userId = user?.uid || "local_user";
        const prodId = product?.id || generateUUID();
        imageUrl = await uploadProductImage(userId, prodId, selectedFile);
      } else if (data.imageUrl?.startsWith('img_') && imagePreview && imagePreview.startsWith('data:')) {
        // Auto-migrace: pokud má produkt starý lokální IndexedDB klíč (img_...), převedeme jej na kompaktní dataUrl pro synchronizaci do všech pokladen
        imageUrl = imagePreview;
      } else if (data.imageUrl) {
        imageUrl = data.imageUrl;
      }

      const selectedCats = data.categories || [];
      const primaryCategory = selectedCats[0] || "";

      const finalData = { 
        ...data, 
        category: primaryCategory,
        categories: selectedCats,
        imageUrl 
      };
      
      if (product) {
        await onSubmit({ ...product, ...finalData });
      } else {
        await onSubmit(finalData);
      }
    } catch (err: any) {
      console.error("Chyba při ukládání produktu:", err);
      toast({
        variant: "destructive",
        title: "Chyba při ukládání",
        description: err.message || "Nepodařilo se uložit obrázek produktu.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Název produktu</FormLabel>
              <FormControl>
                <Input placeholder="např. Náramek" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prodejní cena (Kč)</FormLabel>
                <FormControl>
                  <Input type="number" step="1" placeholder="85" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nákupní cena (Kč)</FormLabel>
                <FormControl>
                  <Input type="number" step="1" placeholder="25" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skladem (ks)</FormLabel>
              <FormControl>
                <Input type="number" step="1" placeholder="20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* MULTI-CATEGORY SELECTION */}
        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => {
            const selectedCats: string[] = Array.isArray(field.value) ? field.value : [];
            const toggleCategory = (cat: string) => {
              const next = selectedCats.includes(cat)
                ? selectedCats.filter((c) => c !== cat)
                : [...selectedCats, cat];
              field.onChange(next);
              form.setValue("category", next[0] || "");
            };

            return (
              <FormItem className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Kategorie</FormLabel>
                  <span className="text-xs text-muted-foreground font-medium">
                    {selectedCats.length === 0 ? "Žádná vybraná" : `Vybráno: ${selectedCats.length}`}
                  </span>
                </div>
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    Zatím nemáte vytvořené žádné kategorie. Můžete je přidat v sekci Kategorie.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {categories.map((cat) => {
                      const isSelected = selectedCats.includes(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border select-none cursor-pointer active:scale-95",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                              : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground font-normal"
                          )}
                        >
                          <Tag className="h-3 w-3" />
                          <span>{cat}</span>
                          {isSelected && <Check className="h-3 w-3 ml-0.5 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormItem>
           <FormLabel>Obrázek produktu</FormLabel>
           <div className="flex space-x-2">
             <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormControl>
                    <Input 
                      placeholder="URL nebo nahrát soubor"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setImagePreview(e.target.value);
                        setSelectedFile(null);
                      }}
                      className="flex-grow"
                    />
                  </FormControl>
                )}
              />
            <FormControl>
              <Button asChild variant="outline" className="shrink-0">
                <label className="cursor-pointer">
                  Nahrát...
                  <Input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </Button>
            </FormControl>
           </div>
          {imagePreview && (
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Náhled zobrazení</span>
              <div className="relative w-36 h-36 rounded-xl overflow-hidden border bg-muted/30 shadow-inner">
                <Image 
                  src={imagePreview} 
                  alt="Náhled obrázku" 
                  fill
                  unoptimized={true}
                  className="object-cover" 
                />
              </div>
            </div>
          )}
        </FormItem>
        <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
          {isSubmitting ? "Ukládám produkt a fotku..." : product ? "Uložit změny" : "Vytvořit produkt"}
        </Button>
      </form>
    </Form>
  );
}
