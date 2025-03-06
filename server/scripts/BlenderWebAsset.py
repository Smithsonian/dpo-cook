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

    #get args
    argv = sys.argv
    argv = argv[argv.index("--") + 1:]

    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--input", required=True, help="Input filepath")
    parser.add_argument("-o", "--output", required=False, help="Output filepath")
    parser.add_argument("-f", "--format", required=False, default=".glb", help="Output format")
    parser.add_argument("-mb", "--embed", required=False, default=False, help="Embed gltf content")
    parser.add_argument("-mf", "--metal_factor", required=False, default=0.1, type=float, help="Metallic Factor")
    parser.add_argument("-rf", "--rough_factor", required=False, default=0.6, type=float, help="Roughness Factor")
    parser.add_argument("-dm", "--diffuse", required=False, help="Diffuse filepath")
    parser.add_argument("-om", "--occlusion", required=False, help="Occlusion filepath")
    parser.add_argument("-em", "--emissive", required=False, help="Emissive filepath")
    parser.add_argument("-mrm", "--metalrough", required=False, help="MetalRough filepath")
    parser.add_argument("-nm", "--normal", required=False, help="Normal filepath")
    parser.add_argument("-os", "--object_space", required=False, default=False, help="Object space normals")
    parser.add_argument("-uc", "--use_compression", required=False, default=False, help="Use compression")
    parser.add_argument("-cl", "--compression_level", required=False, default=10, type=int, help="Compression level")
    parser.add_argument("-ab", "--alpha_blend", required=False, default=False, help="Blend alpha channel")
    args = parser.parse_known_args(argv)[0]

    #parse arguments to format needed by Blender
    do_embed = convert(args.embed)
    output_format = 'GLB'
    if args.format != '.glb':
        if do_embed is False:
            output_format = 'GLTF_SEPARATE'
        else:
            output_format = 'GLTF_EMBEDDED'
    do_compress = convert(args.use_compression)
    do_blend = convert(args.alpha_blend)
    is_obj_space = convert(args.object_space)
    image_format = 'JPEG' if do_blend is False else 'AUTO'
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
        if tex_type != "Normal":
            mat.node_tree.links.new(bsdf.inputs[tex_type], tex_image.outputs['Color'])
        else:
            ##print(tex_image.bl_rna.properties.keys())
            tex_image.image.colorspace_settings.name = 'Non-Color'
            normal_map_node = mat.node_tree.nodes.new('ShaderNodeNormalMap')
            normal_map_node.label = 'Normal Map'
            #set object space normals if needed
            if is_obj_space is True: 
                normal_map_node.space = 'OBJECT'
            mat.node_tree.links.new(tex_image.outputs['Color'], normal_map_node.inputs['Color'])
            mat.node_tree.links.new(normal_map_node.outputs['Normal'], bsdf.inputs['Normal'])

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
        if args.metalrough != args.occlusion:
            mr_tex_image = mat.node_tree.nodes.new('ShaderNodeTexImage')
            mr_tex_image.image = bpy.data.images.load(args.metalrough)
            mr_tex_image.image.colorspace_settings.name = "Non-Color"
        else:
            mr_tex_image = occ_tex_image
        separate_node_bg = mat.node_tree.nodes.new('ShaderNodeSeparateColor')
        mat.node_tree.links.new(separate_node_bg.inputs[0], mr_tex_image.outputs['Color'])
        mat.node_tree.links.new(bsdf.inputs['Metallic'], separate_node_bg.outputs['Blue'])
        mat.node_tree.links.new(bsdf.inputs['Roughness'], separate_node_bg.outputs['Green'])
    else:
        #shift default roughness to 0.6 for better results
        bsdf.inputs['Roughness'].default_value = 0.6

    bsdf.inputs['IOR'].default_value = 1.5
    mat.blend_method = 'BLEND' if do_blend is True else 'OPAQUE'
    mat.use_backface_culling = True

    # Set to smooth shading to share normals
    bpy.ops.object.shade_smooth()

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
            export_image_format=image_format)

try:
    run()
except Exception as e:
    print(e)
    sys.exit(1)
