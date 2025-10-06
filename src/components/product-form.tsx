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
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Název musí mít alespoň 2 znaky." }),
  price: z.coerce.number().int({ message: "Cena musí být celé číslo." }).positive({ message: "Cena musí být kladné číslo." }),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  onSubmit: (data: Omit<Product, 'id'> | Product) => void;
  product?: Product | null;
}

export default function ProductForm({ onSubmit, product }: ProductFormProps) {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      price: product?.price || 0,
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
      // New or changed image
      const imageKey = `img_${crypto.randomUUID()}`;
      await saveImage(imageKey, imageDataUrl);
      imageUrl = imageKey;
    } else if (imagePreview && !imagePreview.startsWith('http') && !imagePreview.startsWith('img_')) {
      // Handle legacy base64 data from older versions
      const imageKey = `img_${crypto.randomUUID()}`;
      await saveImage(imageKey, imagePreview);
      imageUrl = imageKey;
    } else if (data.imageUrl && !imageDataUrl) {
      // URL was typed in
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 py-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Název produktu</FormLabel>
              <FormControl>
                <Input placeholder="např. Latte" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cena</FormLabel>
              <FormControl>
                <Input type="number" step="1" placeholder="např. 85" {...field} />
              </FormControl>
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
                <label>
                  Nahrát...
                  <Input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </Button>
            </FormControl>
           </div>
          <FormDescription>
            Zadejte URL nebo nahrajte soubor (max 2MB).
          </FormDescription>
          {imagePreview && (
            <div className="mt-4">
              <Image 
                src={imagePreview} 
                alt="Náhled obrázku" 
                width={100} 
                height={100} 
                className="rounded-md object-cover" 
              />
            </div>
          )}
          <FormMessage />
        </FormItem>
        <Button type="submit" className="w-full">
          {product ? "Uložit změny" : "Vytvořit produkt"}
        </Button>
      </form>
    </Form>
  );
}