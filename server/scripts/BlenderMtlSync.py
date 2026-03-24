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

def run():
    # get rid of default objects
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.outliner.orphans_purge()
    bpy.ops.outliner.orphans_purge()
    bpy.ops.outliner.orphans_purge()

    exportPBR = False

    #get args
    argv = sys.argv
    argv = argv[argv.index("--") + 1:]

    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--input", required=True, help="Input filepath")
    parser.add_argument("-o", "--output", required=False, help="Output filepath")
    parser.add_argument("-dm", "--diffuse", required=False, help="Diffuse filepath")
    parser.add_argument("-mrm", "--metalrough", required=False, help="MetalRough filepath")
    args = parser.parse_known_args(argv)[0]

    textures = []
    if args.diffuse is not None:
        textures.append(('Base Color',args.diffuse))

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
    mat = bpy.data.materials.new(name="SynchedMaterial")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    for tex_type, tex_path in textures:
        tex_image = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex_image.image = bpy.data.images.load(tex_path)
        if tex_type != "Normal":
            mat.node_tree.links.new(bsdf.inputs[tex_type], tex_image.outputs['Color'])

    #handle metal/roughness map
    if args.metalrough is not None:
        exportPBR = True
        mr_tex_image = mat.node_tree.nodes.new('ShaderNodeTexImage')
        mr_tex_image.image = bpy.data.images.load(args.metalrough)
        mr_tex_image.image.colorspace_settings.name = "Non-Color"

        #separate_node_bg = mat.node_tree.nodes.new('ShaderNodeSeparateColor')
        #mat.node_tree.links.new(separate_node_bg.inputs[0], mr_tex_image.outputs['Color'])
        #mat.node_tree.links.new(bsdf.inputs['Metallic'], separate_node_bg.outputs['Blue'])
        #mat.node_tree.links.new(bsdf.inputs['Roughness'], separate_node_bg.outputs['Green'])
        mat.node_tree.links.new(bsdf.inputs['Metallic'], mr_tex_image.outputs['Color'])
        mat.node_tree.links.new(bsdf.inputs['Roughness'], mr_tex_image.outputs['Color'])

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
        save_file = os.path.join(dir, mod_filename + ".obj")
        if file_extension == '.obj':
            bpy.ops.wm.obj_export(filepath=save_file, check_existing=False, export_materials=True, export_pbr_extensions=exportPBR, path_mode='COPY')

try:
    run()
except Exception as e:
    print(e)
    sys.exit(1)
