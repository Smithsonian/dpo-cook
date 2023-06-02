import bpy
import json
import os
import sys
import argparse

def convert(s):
    if s.lower() == "true":
        return True
    else:
        return False

# get rid of default objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.outliner.orphans_purge()
bpy.ops.outliner.orphans_purge()
bpy.ops.outliner.orphans_purge()

#get args
argv = sys.argv
argv = argv[argv.index("--") + 1:]

parser = argparse.ArgumentParser()
parser.add_argument("-i", "--input", required=True, help="Input filepath")
parser.add_argument("-o", "--output", required=False, help="Output filepath")
parser.add_argument("-f", "--format", required=False, default=".glb", help="Output format")
parser.add_argument("-mf", "--metal_factor", required=False, default=0.1, type=float, help="Metallic Factor")
parser.add_argument("-rf", "--rough_factor", required=False, default=0.8, type=float, help="Roughness Factor")
parser.add_argument("-dm", "--diffuse", required=False, help="Diffuse filepath")
parser.add_argument("-om", "--occlusion", required=False, help="Occlusion filepath")
parser.add_argument("-em", "--emissive", required=False, help="Emissive filepath")
parser.add_argument("-mrm", "--metalrough", required=False, help="MetalRough filepath")
parser.add_argument("-nm", "--normal", required=False, help="Normal filepath")
parser.add_argument("-uc", "--use_compression", required=False, default=False, help="Use compression")
parser.add_argument("-cl", "--compression_level", required=False, default=10, type=int, help="Compression level")
args = parser.parse_known_args(argv)[0]

#parse arguments to format needed by Blender
output_format = 'GLB' if args.format == '.glb' else 'GLTF_SEPARATE'
do_compress = convert(args.use_compression);
textures = []
if args.diffuse is not None:
    textures.append(('Base Color',args.diffuse))
if args.emissive is not None:
    textures.append(('Emission',args.emissive))
if args.normal is not None:
    textures.append(('Normal',args.normal))

#get import file extension
filename, file_extension = os.path.splitext(args.input)
file_extension = file_extension.lower()

#import scene
if file_extension == '.obj':
    bpy.ops.wm.obj_import(filepath=args.input)
elif file_extension == '.ply':
    bpy.ops.import_mesh.ply(filepath=args.input)
elif file_extension == '.stl':
    bpy.ops.import_mesh.stl(filepath=args.input)
elif file_extension == '.x3d':
    bpy.ops.import_scene.x3d(filepath=args.input)
elif file_extension == '.dae':
    bpy.ops.wm.collada_import(filepath=args.input)
elif file_extension == '.fbx':
    bpy.ops.import_scene.fbx(filepath=args.input)
elif file_extension == '.glb' or file_extension == '.gltf':
    bpy.ops.import_scene.gltf(filepath=args.input)
else:
    print("Error: Unsupported file type: " + file_extension)
    sys.exit(1)

#assign material attributes
mat = bpy.data.materials.new(name="glTFMaterial")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
for tex_type, tex_path in textures:
    tex_image = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex_image.image = bpy.data.images.load(tex_path)
    mat.node_tree.links.new(bsdf.inputs[tex_type], tex_image.outputs['Color'])

#occlusion is not natively supported, so add special settings node
if args.occlusion is not None:
    settings_node = mat.node_tree.nodes.new('ShaderNodeGroup')
    gltf_node_group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    gltf_node_group.inputs.new("NodeSocketFloat", "Occlusion")
    settings_node.node_tree = gltf_node_group
    occ_tex_image = mat.node_tree.nodes.new('ShaderNodeTexImage')
    occ_tex_image.image = bpy.data.images.load(args.occlusion)
    occ_tex_image.image.colorspace_settings.name = "Non-Color"
    separate_node = mat.node_tree.nodes.new('ShaderNodeSeparateColor')
    mat.node_tree.links.new(separate_node.inputs[0], occ_tex_image.outputs['Color'])
    mat.node_tree.links.new(settings_node.inputs["Occlusion"], separate_node.outputs['Red'])

#handle metal/roughness map
if args.metalrough is not None:
    mr_tex_image = mat.node_tree.nodes.new('ShaderNodeTexImage')
    mr_tex_image.image = bpy.data.images.load(args.metalrough)
    mr_tex_image.image.colorspace_settings.name = "Non-Color"
    mat.node_tree.links.new(bsdf.inputs['Metallic'], mr_tex_image.outputs['Color'])
    mat.node_tree.links.new(bsdf.inputs['Roughness'], mr_tex_image.outputs['Color'])

bsdf.inputs['IOR'].default_value = 1.5

# Get the active object and assign material
obj = bpy.context.active_object
obj.active_material = mat

try: #check for provided output filename
    mod_filename, file_extension = os.path.splitext(args.output)
except IndexError:
    mod_filename = filename
    
print("Exporting file: " + mod_filename)
if len(bpy.data.objects) > 0:
    path = bpy.data.filepath
    dir = os.path.dirname(path)
    save_file = os.path.join(dir, mod_filename + args.format)
    bpy.ops.export_scene.gltf(filepath=save_file, check_existing=False, export_materials="EXPORT", \
        export_format=output_format, export_draco_mesh_compression_enable=do_compress, export_draco_mesh_compression_level=args.compression_level, \
        export_image_format="JPEG")
