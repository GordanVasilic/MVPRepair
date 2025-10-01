-- Create storage bucket for issue images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('issue-images', 'issue-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload issue images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'issue-images');

-- Create storage policy to allow public read access to issue images
CREATE POLICY "Allow public read access to issue images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'issue-images');

-- Create storage policy to allow users to update their own uploaded images
CREATE POLICY "Allow users to update their own issue images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'issue-images' AND auth.uid()::text = owner);

-- Create storage policy to allow users to delete their own uploaded images
CREATE POLICY "Allow users to delete their own issue images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'issue-images' AND auth.uid()::text = owner);