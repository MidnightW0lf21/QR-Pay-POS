"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";
import { useState, useEffect } from "react";
import { saveImage, getImage } from "@/lib/db";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Název musí mít alespoň 2 znaky." }),
  price: z.coerce.number().int({ message: "Cena musí být celé číslo." }).positive({ message: "Cena musí být kladné číslo." }),
  stock: z.coerce.number().int({ message: "Sklad musí být celé číslo." }).min(0, { message: "Sklad musí být nezáporné číslo." }),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  onSubmit: (data: Omit<Product, 'id'> | Product) => void;
  product?: Product | null;
  categories: string[];
}

export default function ProductForm({ onSubmit, product, categories }: ProductFormProps) {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      price: product?.price || 0,
      stock: product?.stock || 0,
      category: product?.category || "",
      imageUrl: product?.imageUrl || "",
    },
  });

  useEffect(() => {
    async function loadInitialImage() {
      if (product?.imageUrl) {
        if (product.imageUrl.startsWith('data:')) {
          setImagePreview(product.imageUrl);
          setImageDataUrl(product.imageUrl);
        } else if (product.imageUrl.startsWith('img_')) {
          const storedImage = await getImage(product.imageUrl);
          if (storedImage) {
            setImagePreview(storedImage);
            setImageDataUrl(storedImage);
          }
        } else {
           setImagePreview(product.imageUrl);
        }
      }
    }
    loadInitialImage();
  }, [product]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "Soubor je příliš velký",
          description: "Prosím nahrajte obrázek menší než 2MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        setImageDataUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (data: ProductFormValues) => {
    let imageUrl = product?.imageUrl || "";

    if (imageDataUrl && (!product?.imageUrl || imageDataUrl !== imagePreview)) {
      const imageKey = `img_${crypto.randomUUID()}`;
      await saveImage(imageKey, imageDataUrl);
      imageUrl = imageKey;
    } else if (imagePreview && !imagePreview.startsWith('http') && !imagePreview.startsWith('img_')) {
      const imageKey = `img_${crypto.randomUUID()}`;
      await saveImage(imageKey, imagePreview);
      imageUrl = imageKey;
    } else if (data.imageUrl && !imageDataUrl) {
      imageUrl = data.imageUrl;
    }

    const finalData = { ...data, imageUrl };
    
    if (product) {
      onSubmit({ ...product, ...finalData });
    } else {
      onSubmit(finalData);
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
                <FormLabel>Cena (Kč)</FormLabel>
                <FormControl>
                  <Input type="number" step="1" placeholder="85" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </div>
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategorie</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte kategorii" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Žádná</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
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
                        setImageDataUrl(null);
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
            <div className="mt-4 flex justify-center">
              <Image 
                src={imagePreview} 
                alt="Náhled obrázku" 
                width={120} 
                height={120} 
                className="rounded-lg object-cover border" 
              />
            </div>
          )}
        </FormItem>
        <Button type="submit" className="w-full h-12 text-lg">
          {product ? "Uložit změny" : "Vytvořit produkt"}
        </Button>
      </form>
    </Form>
  );
}
