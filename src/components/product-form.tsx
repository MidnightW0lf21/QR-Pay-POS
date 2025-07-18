"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";
import { useState } from "react";

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
  imageUrl: z.string().url({ message: "Zadejte platnou URL adresu obrázku nebo nahrajte soubor." }).optional().or(z.literal("")),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  onSubmit: (data: (ProductFormValues & { imageUrl?: string }) | (Product & { imageUrl?: string })) => void;
  product?: Product | null;
}

export default function ProductForm({ onSubmit, product }: ProductFormProps) {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      price: product?.price || 0,
      imageUrl: product?.imageUrl || "",
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        toast({
          variant: "destructive",
          title: "Soubor je příliš velký",
          description: "Prosím nahrajte obrázek menší než 1MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        form.setValue("imageUrl", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (data: ProductFormValues) => {
    const finalData = { ...data, imageUrl: imagePreview || data.imageUrl };
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
          <FormControl>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
          </FormControl>
          <FormDescription>
            Nahrajte vlastní obrázek pro produkt (max 1MB).
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
