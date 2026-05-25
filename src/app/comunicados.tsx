import { Image, StyleSheet, View } from 'react-native';
export default function Comunicados(){
    return(
        <View style = {styles.container}>
            <Image source={require('../../assets/images/megafone.png')} style={styles.image}></Image>
        </View>

    )
}
    const styles = StyleSheet.create({
        container: {
        backgroundColor: '#f3e9d7',
        flex: 1,
    },
        image: {
            width: 60,
            height: 60,
            position: 'absolute',
            top: 10,
            left: 10,
        },
    })
