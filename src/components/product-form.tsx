"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";
import { useState, useEffect } from "react";
import { saveImage, getImage } from "@/lib/db";
import { uploadProductImage } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";

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
import { generateUUID } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Název musí mít alespoň 2 znaky." }),
  price: z.coerce.number().int({ message: "Cena musí být celé číslo." }).positive({ message: "Cena musí být kladné číslo." }),
  costPrice: z.coerce.number().int({ message: "Nákupní cena musí být celé číslo." }).min(0, { message: "Nákupní cena musí být nezáporné číslo." }),
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
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      price: product?.price || 0,
      costPrice: product?.costPrice || 0,
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      } else if (data.imageUrl) {
        imageUrl = data.imageUrl;
      }

      const finalData = { ...data, imageUrl };
      
      if (product) {
        onSubmit({ ...product, ...finalData });
      } else {
        onSubmit(finalData);
      }
    } catch (err: any) {
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
            <div className="mt-4 flex justify-center">
              <Image 
                src={imagePreview} 
                alt="Náhled obrázku" 
                width={120} 
                height={120} 
                unoptimized={true}
                className="rounded-lg object-cover border" 
              />
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
